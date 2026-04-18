from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.neighbors import kneighbors_graph

logger = logging.getLogger(__name__)

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


@dataclass(frozen=True)
class ClusterResult:
    cluster_id: int
    chunk_ids: list[str]
    chunk_texts: list[str]
    facets: list[str]
    stances: list[str]
    keywords: list[str]
    entity_ids: list[str] = field(default_factory=list)


def _build_knn_graph(embeddings: np.ndarray, k: int = 15) -> csr_matrix:
    n_samples = embeddings.shape[0]
    k_actual = min(k, n_samples - 1)
    if k_actual < 1:
        return csr_matrix((n_samples, n_samples))

    dist_matrix = kneighbors_graph(
        embeddings, n_neighbors=k_actual, metric="cosine", mode="distance"
    )
    sim_matrix = 1 - dist_matrix.toarray()
    np.clip(sim_matrix, 0, None, out=sim_matrix)
    sym = (sim_matrix + sim_matrix.T) / 2
    np.fill_diagonal(sym, 0)
    return csr_matrix(sym)


def _leiden_cluster(
    sim_matrix: csr_matrix,
    target_range: tuple[int, int],
    max_iterations: int = 10,
) -> list[int] | None:
    import igraph as ig
    import leidenalg

    dense = sim_matrix.toarray()
    sources, targets = np.where(dense > 0)
    weights = dense[sources, targets].tolist()

    n = dense.shape[0]
    g = ig.Graph(n=n, edges=list(zip(sources.tolist(), targets.tolist())), directed=False)
    g.es["weight"] = weights
    g.simplify(combine_edges="max")

    lo, hi = 0.001, 0.5
    resolution = 0.03

    for _ in range(max_iterations):
        partition = leidenalg.find_partition(
            g,
            leidenalg.CPMVertexPartition,
            resolution_parameter=resolution,
            weights="weight",
            n_iterations=-1,
            seed=42,
        )
        n_communities = len(set(partition.membership))

        if target_range[0] <= n_communities <= target_range[1]:
            return partition.membership

        if n_communities < target_range[0]:
            hi = resolution
            resolution = (lo + resolution) / 2
        else:
            lo = resolution
            resolution = (resolution + hi) / 2

    return None


def _kmeans_fallback(embeddings: np.ndarray, n_clusters: int) -> list[int]:
    from sklearn.cluster import KMeans

    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    return km.fit_predict(embeddings).tolist()


def _merge_small_clusters(
    labels: list[int],
    embeddings: np.ndarray,
    min_size: int = 3,
) -> list[int]:
    from collections import Counter

    counts = Counter(labels)
    labels = list(labels)

    for cluster_id, count in list(counts.items()):
        if count >= min_size:
            continue

        indices = [i for i, lbl in enumerate(labels) if lbl == cluster_id]
        centroid = embeddings[indices].mean(axis=0)

        best_cluster = None
        best_sim = -1.0
        for other_id in set(labels):
            if other_id == cluster_id:
                continue
            other_indices = [i for i, lbl in enumerate(labels) if lbl == other_id]
            if not other_indices:
                continue
            other_centroid = embeddings[other_indices].mean(axis=0)
            sim = float(np.dot(centroid, other_centroid) / (
                np.linalg.norm(centroid) * np.linalg.norm(other_centroid) + 1e-10
            ))
            if sim > best_sim:
                best_sim = sim
                best_cluster = other_id

        if best_cluster is not None:
            for i in indices:
                labels[i] = best_cluster

    return labels


def _extract_keywords(
    cluster_texts: dict[int, list[str]],
    top_n: int = 10,
) -> dict[int, list[str]]:
    if not cluster_texts:
        return {}

    cluster_ids = sorted(cluster_texts.keys())
    documents = [" ".join(cluster_texts[cid]) for cid in cluster_ids]

    vectorizer = CountVectorizer(stop_words="english", max_features=5000)
    try:
        tf_matrix = vectorizer.fit_transform(documents)
    except ValueError:
        return {cid: [] for cid in cluster_ids}

    feature_names = vectorizer.get_feature_names_out()
    n_docs = len(documents)

    doc_freq = (tf_matrix > 0).sum(axis=0).A1
    idf = np.log(1 + n_docs / (doc_freq + 1e-10))

    tfidf = tf_matrix.toarray() * idf

    result: dict[int, list[str]] = {}
    for idx, cid in enumerate(cluster_ids):
        scores = tfidf[idx]
        top_indices = scores.argsort()[-top_n:][::-1]
        result[cid] = [feature_names[i] for i in top_indices if scores[i] > 0]

    return result


async def cluster_chunks(
    chunks: list[dict],
    target_range: tuple[int, int] = (3, 8),
) -> list[ClusterResult]:
    if not chunks:
        logger.warning("Empty chunks list, returning empty clusters")
        return []

    if len(chunks) < target_range[0]:
        logger.warning(
            "Fewer chunks (%d) than minimum target (%d), returning single cluster",
            len(chunks),
            target_range[0],
        )
        from collections import Counter

        facets = [c.get("facet", "other") for c in chunks]
        stances = [c.get("stance", "mixed") for c in chunks]
        return [
            ClusterResult(
                cluster_id=0,
                chunk_ids=[c["id"] for c in chunks],
                chunk_texts=[c["text"] for c in chunks],
                facets=[f for f, _ in Counter(facets).most_common()],
                stances=[s for s, _ in Counter(stances).most_common()],
                keywords=[],
                entity_ids=[eid for c in chunks for eid in c.get("entity_ids", [])],
            )
        ]

    texts = [c["text"] for c in chunks]
    model = _get_model()
    embeddings = await asyncio.to_thread(model.encode, texts, normalize_embeddings=True)
    embeddings = np.array(embeddings)

    sim_matrix = _build_knn_graph(embeddings, k=min(15, len(chunks) - 1))

    labels = _leiden_cluster(sim_matrix, target_range)
    if labels is None:
        logger.info("Leiden did not converge, falling back to k-means")
        n_clusters = (target_range[0] + target_range[1]) // 2
        labels = _kmeans_fallback(embeddings, min(n_clusters, len(chunks)))

    labels = _merge_small_clusters(labels, embeddings, min_size=3)

    from collections import Counter

    cluster_map: dict[int, list[int]] = {}
    for idx, lbl in enumerate(labels):
        cluster_map.setdefault(lbl, []).append(idx)

    cluster_texts_map: dict[int, list[str]] = {
        cid: [texts[i] for i in indices] for cid, indices in cluster_map.items()
    }
    keywords_map = _extract_keywords(cluster_texts_map)

    results: list[ClusterResult] = []
    for new_id, (cid, indices) in enumerate(sorted(cluster_map.items())):
        cluster_chunks_data = [chunks[i] for i in indices]
        facets = [c.get("facet", "other") for c in cluster_chunks_data]
        stances = [c.get("stance", "mixed") for c in cluster_chunks_data]
        entity_ids = list(
            {eid for c in cluster_chunks_data for eid in c.get("entity_ids", [])}
        )

        results.append(
            ClusterResult(
                cluster_id=new_id,
                chunk_ids=[c["id"] for c in cluster_chunks_data],
                chunk_texts=[c["text"] for c in cluster_chunks_data],
                facets=[f for f, _ in Counter(facets).most_common()],
                stances=[s for s, _ in Counter(stances).most_common()],
                keywords=keywords_map.get(cid, []),
                entity_ids=entity_ids,
            )
        )

    return results
