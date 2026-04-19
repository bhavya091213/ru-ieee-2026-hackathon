from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import networkx as nx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ScoredChunk:
    chunk_id: str
    doc_id: str
    text: str
    score: float
    metadata: dict[str, Any]


@dataclass(frozen=True)
class GraphNode:
    entity_id: str
    title: str
    type: str
    description: str
    community_id: str | None


@dataclass(frozen=True)
class RetrievalResult:
    chunks: list[ScoredChunk]
    graph_neighbors: list[GraphNode]
    entity_ids: list[str]


def retrieve(
    query: str,
    canonical_product: str,
    facets: list[str] | None = None,
    stances: list[str] | None = None,
    top_k: int = 12,
    chroma_store=None,
    graph: nx.Graph | None = None,
) -> RetrievalResult:
    if not query:
        return RetrievalResult(chunks=[], graph_neighbors=[], entity_ids=[])

    if chroma_store is None:
        raise ValueError("chroma_store is required for retrieval")

    where_clauses: list[dict] = []
    where_clauses.append({"metadata_canonical_product": {"$eq": canonical_product}})
    if facets:
        where_clauses.append({"facet": {"$in": facets}})
    if stances:
        where_clauses.append({"stance": {"$in": stances}})

    where = {"$and": where_clauses} if len(where_clauses) > 1 else where_clauses[0]

    raw_results = chroma_store.search(query, n_results=top_k * 2, where=where)

    scored_chunks: list[ScoredChunk] = []
    for r in raw_results:
        score = 1.0 - r.get("distance", 0.5)
        scored_chunks.append(ScoredChunk(
            chunk_id=r["chunk_id"],
            doc_id=r.get("metadata", {}).get("doc_id", ""),
            text=r["text"],
            score=score,
            metadata=r.get("metadata", {}),
        ))

    scored_chunks.sort(key=lambda c: c.score, reverse=True)
    scored_chunks = scored_chunks[:top_k]

    if graph is None:
        return RetrievalResult(
            chunks=scored_chunks,
            graph_neighbors=[],
            entity_ids=[],
        )

    matched_chunk_ids = {c.chunk_id for c in scored_chunks}
    entity_ids: list[str] = []
    for node_id, data in graph.nodes(data=True):
        node_text_units = set(data.get("text_unit_ids", []))
        if node_text_units & matched_chunk_ids:
            entity_ids.append(node_id)

    neighbor_ids: set[str] = set()
    for eid in entity_ids:
        if graph.has_node(eid):
            for neighbor in graph.neighbors(eid):
                neighbor_ids.add(neighbor)

    all_entity_ids = set(entity_ids) | neighbor_ids
    graph_neighbors: list[GraphNode] = []
    for nid in all_entity_ids:
        if graph.has_node(nid):
            data = graph.nodes[nid]
            graph_neighbors.append(GraphNode(
                entity_id=nid,
                title=data.get("title", nid),
                type=data.get("type", "unknown"),
                description=data.get("description", ""),
                community_id=data.get("community_id"),
            ))

    return RetrievalResult(
        chunks=scored_chunks,
        graph_neighbors=graph_neighbors,
        entity_ids=entity_ids,
    )
