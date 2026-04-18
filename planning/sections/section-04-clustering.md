Those sections have not been written yet, so I will reference them as dependencies. I now have everything I need to write the section. Let me synthesize the content.

# Section 04: Clustering Pipeline

## Overview

This section implements the evidence clustering pipeline that transforms raw text chunks into grouped segment candidates. It covers embedding generation with sentence-transformers, KNN similarity graph construction, Leiden community detection with automatic resolution tuning, a k-means fallback, minimum cluster size enforcement with merging, and c-TF-IDF keyword extraction per cluster.

The output of this section is a `cluster_chunks()` function and a `ClusterResult` data structure. The downstream consumer is **section-05-persona-synthesis**, which takes the cluster results and calls Gemini to synthesize personas from them.

---

## Dependencies

- **section-01-schemas**: Provides the `Persona`, `Belief`, and facet/stance literal types. This section needs access to the facet literals for keyword/facet extraction.
- **section-02-gemini-client**: Not directly used by the clustering pipeline (no LLM calls here), but the `generate_structured()` utility is used by the downstream persona synthesis step.

The clustering pipeline itself is pure computation (embeddings, graph algorithms, TF-IDF) with no Gemini calls.

---

## File Structure

```
core/
  personas/
    __init__.py
    cluster.py          # Main clustering pipeline
tests/
  personas/
    __init__.py
    test_cluster.py     # All clustering tests
```

---

## Tests (Write First)

All tests go in `/tests/personas/test_cluster.py`. Use **pytest** with **pytest-asyncio**. The clustering function is async.

```python
# tests/personas/test_cluster.py

# --- ClusterResult data structure ---
# Test: ClusterResult stores cluster_id, chunk_texts, chunk_ids, keywords, facets, stances

# --- Embedding + KNN graph ---
# Test: KNN graph is symmetric after symmetrization
# Test: KNN graph has no self-loops

# --- Leiden clustering ---
# Test: cluster_chunks with known embeddings produces expected cluster count
# Test: cluster_chunks respects target_range (3, 8) bounds
# Test: cluster_chunks auto-tunes resolution when initial produces <3 clusters
# Test: cluster_chunks auto-tunes resolution when initial produces >8 clusters
# Test: cluster_chunks caps binary search at 10 iterations

# --- Fallback ---
# Test: cluster_chunks falls back to k-means after 10 iterations

# --- Merge logic ---
# Test: cluster_chunks merges clusters with <3 chunks into nearest neighbor

# --- Output shape ---
# Test: cluster_chunks returns ClusterResult with chunk texts and keywords
```

### Test Design Notes

**Known embeddings test**: Create a synthetic dataset of ~30 vectors in 384 dimensions with 4-5 clearly separable clusters (e.g., points tightly grouped around 4-5 centroids with small random noise). Pass these directly to the clustering function (or monkey-patch the embedding step) and assert the cluster count falls within (3, 8).

**Auto-tuning tests**: Mock the Leiden partition call to return a controlled number of communities. For the "<3 clusters" test, have the first call return 2 communities and subsequent calls return values in range. For the ">8 clusters" test, have the first call return 12 communities. Assert the binary search adjusts resolution and the final count is within bounds.

**10-iteration cap test**: Mock Leiden to always return an out-of-range count (e.g., always 2). Assert that after 10 iterations, the function stops trying Leiden and falls back to k-means.

**k-means fallback test**: When Leiden fails to converge, assert the function uses `sklearn.cluster.KMeans` with `n_clusters=5` and returns valid clusters.

**Merge test**: Create a scenario where one cluster has only 1-2 chunks. Assert it gets merged into the nearest cluster by centroid cosine similarity, and no cluster in the output has fewer than 3 chunks (unless the total data is too small).

**KNN symmetry test**: Build a KNN graph from test embeddings, apply the symmetrization step, then check that the resulting sparse matrix equals its transpose.

**No self-loops test**: After building the KNN graph, check the diagonal of the adjacency matrix is all zeros.

---

## Implementation Details

### `ClusterResult` Data Structure

Define a simple data class in `core/personas/cluster.py` to hold the output of clustering for one cluster.

```python
@dataclass(frozen=True)
class ClusterResult:
    """Output of the clustering pipeline for a single cluster."""
    cluster_id: int
    chunk_ids: list[str]
    chunk_texts: list[str]
    facets: list[str]       # Most common facets found in this cluster's chunks
    stances: list[str]      # Most common stances found in this cluster's chunks
    keywords: list[str]     # Top keywords via c-TF-IDF
    entity_ids: list[str]   # Graph entity IDs from WS1 community labels (if available)
```

Use a frozen dataclass to enforce immutability.

### `cluster_chunks()` Function Signature

```python
async def cluster_chunks(
    chunks: list[dict],
    target_range: tuple[int, int] = (3, 8),
) -> list[ClusterResult]:
    """Embed chunks, build KNN graph, run Leiden, return cluster assignments with evidence.

    Each dict in chunks must have at minimum: 'id' (str), 'text' (str).
    Optional keys: 'facet' (str), 'stance' (str), 'entity_ids' (list[str]).

    Returns one ClusterResult per discovered cluster, each containing at least 3 chunks.
    """
```

### Step 1: Embed Chunks

Load the `sentence-transformers/all-MiniLM-L6-v2` model. This produces 384-dimensional normalized vectors.

- Use `SentenceTransformer("all-MiniLM-L6-v2")` from the `sentence-transformers` package.
- Call `model.encode(texts, normalize_embeddings=True)` where `texts` is the list of chunk text strings.
- The model should be loaded once and cached at the module level (lazy singleton pattern) to avoid reloading on repeated calls.
- The encode call is synchronous and CPU-bound. Wrap it in `asyncio.to_thread()` so it does not block the event loop.

### Step 2: Build KNN Similarity Graph

Construct a k-nearest-neighbors graph and convert it to a similarity matrix.

- Use `sklearn.neighbors.kneighbors_graph(embeddings, n_neighbors=15, metric="cosine", mode="distance")` to get a sparse distance matrix.
- Convert distance to similarity: `sim = 1 - distance_matrix`.
- Clip any negative values to 0 (can happen due to floating point).
- Symmetrize: `sym = (sim + sim.T) / 2`.
- Zero out the diagonal (no self-loops).
- The result is a sparse `csr_matrix` suitable for igraph.

### Step 3: Leiden Community Detection

Run Leiden with automatic resolution tuning to hit the target cluster count.

- Convert the sparse matrix to an `igraph.Graph.Weighted_Adjacency` graph using the symmetrized similarity matrix.
- Use `leidenalg.find_partition` with `leidenalg.CPMVertexPartition`.
- **Initial resolution**: 0.03.
- **Convergence parameters**: `n_iterations=-1` (run until convergence), `seed=42` (reproducibility).
- **Auto-tuning loop**: After each Leiden run, count the number of communities. If the count is outside `target_range`:
  - If too few clusters (< target_range[0]): decrease resolution (makes it easier to form communities).
  - If too many clusters (> target_range[1]): increase resolution (merges small communities).
  - Use binary search within the range [0.001, 0.5].
  - Cap at 10 iterations of the binary search.
- **Fallback**: If after 10 iterations no resolution produces a cluster count within `target_range`, fall back to `sklearn.cluster.KMeans` with `n_clusters=5` (midpoint of the default target range, or `(target_range[0] + target_range[1]) // 2`).

### Step 4: Minimum Cluster Size Enforcement

After clustering (whether Leiden or k-means), enforce a minimum cluster size of 3 chunks.

- For any cluster with fewer than 3 chunks, find the nearest cluster by centroid cosine similarity and merge into it.
- Centroid = mean of all embeddings in the cluster.
- Cosine similarity between centroids determines the "nearest" cluster.
- Repeat until all clusters have at least 3 members (a single pass should suffice since merging only adds chunks).

### Step 5: Per-Cluster Evidence Collection and Keyword Extraction

For each cluster, build a `ClusterResult`:

- **chunk_ids**: IDs of chunks assigned to this cluster.
- **chunk_texts**: Text strings of chunks in this cluster.
- **facets**: Collect the `facet` field from each chunk dict (if present), take the most common values.
- **stances**: Collect the `stance` field from each chunk dict (if present), take the most common values.
- **entity_ids**: Collect `entity_ids` from each chunk dict (if present), flatten and deduplicate.
- **keywords**: Extract top keywords using c-TF-IDF.

**c-TF-IDF keyword extraction**:
- For each cluster, concatenate all chunk texts into one document. This produces N documents (one per cluster).
- Use `sklearn.feature_extraction.text.CountVectorizer` to get term frequencies across all cluster-documents.
- Compute TF-IDF where the "IDF" is the inverse cluster frequency: `log(1 + N_clusters / n_clusters_containing_term)`.
- For each cluster, rank terms by their c-TF-IDF score and take the top 10 as keywords.
- Use `stop_words="english"` and `max_features=5000` in the CountVectorizer to keep it manageable.

---

## Package Dependencies

The following packages are required for this section. They should be added to the project's dependency file (e.g., `pyproject.toml`):

- `sentence-transformers` -- for embedding generation (brings in `torch` as a transitive dependency)
- `scikit-learn` -- for `kneighbors_graph`, `KMeans`, `CountVectorizer`
- `igraph` -- for graph construction from sparse matrix
- `leidenalg` -- for Leiden community detection
- `numpy` -- for array operations (transitive from scikit-learn/sentence-transformers, but used directly)
- `scipy` -- for sparse matrix operations (transitive from scikit-learn, but used directly)

---

## Edge Cases and Error Handling

- **Too few chunks** (fewer than `target_range[0]`): If the total number of chunks is less than the minimum target cluster count, skip clustering entirely and return all chunks in a single cluster. Log a warning.
- **Empty chunks list**: Return an empty list. Log a warning.
- **Identical embeddings**: If all embeddings are identical (zero variance), the KNN graph will have uniform distances. Leiden will likely put everything in one cluster. The fallback to k-means will handle this, though k-means with identical points produces arbitrary assignments. This is acceptable for the demo.
- **Embedding model download**: The first call to `SentenceTransformer("all-MiniLM-L6-v2")` downloads the model if not cached. This can take time. The lazy singleton pattern ensures it only happens once. In production, the model should be pre-downloaded. For the hackathon, accept the first-call latency.

---

## Integration Points

- **Input**: The `chunks` parameter is a list of dicts. Each dict should have `id` and `text` keys at minimum. Additional keys (`facet`, `stance`, `entity_ids`) are optional and come from WS1's extraction pipeline or the mock layer (section-07-retrieval-mock).
- **Output**: A list of `ClusterResult` objects. Consumed by `synthesize_personas()` in section-05-persona-synthesis, which feeds each cluster's evidence into a Gemini call to produce a `Persona`.
- **No Gemini calls**: This section is entirely local computation. It does not depend on the Gemini client or network connectivity (aside from the one-time model download).