Now I have comprehensive context. Let me write the section content.

# Section 8: Unified Retrieval Layer

## Overview

This section implements the final query-time module of the data pipeline: `core/indexing/retrieve.py`. This module combines ChromaDB semantic search with metadata filtering, entity matching, and 1-hop graph neighborhood traversal to produce a rich retrieval result. It is the primary interface consumed by WS2 (the AI engine) to ground persona generation, simulation, and analyst synthesis in evidence.

The retrieval function is **synchronous** (not async). WS2 can call it via `await asyncio.to_thread(retrieve, ...)` from async code.

---

## Dependencies

| Dependency | Section | What It Provides |
|-----------|---------|------------------|
| ChromaDB vector store | section-05 | `ChunksStore` class with `query()` method returning ranked chunks filtered by metadata |
| Embedding module | section-05 | `embed_texts()` function for embedding the query string |
| NetworkX knowledge graph | section-06 | `graph.json` serialized via `node_link_data()`, with entity nodes having `title`, `type`, `description`, `text_unit_ids`, `community_id` attributes |
| Community assignments | section-07 | `community_id` attribute on graph nodes (set at resolution 1.0) |
| Parquet tables | section-07 | `entities.parquet` for entity metadata lookups (optional, graph in memory is primary) |
| Project setup | section-01 | pyproject.toml with networkx, chromadb, sentence-transformers dependencies; directory structure; shared test fixtures |

**The retrieval module requires that both section-05 (embedding + ChromaDB) and section-07 (parquet + communities) are complete.** It reads from the populated ChromaDB collection and the in-memory (or JSON-deserialized) NetworkX graph.

---

## Interface Contract

The retrieval function signature and return types follow the WS1 interface contract. Note: `scenario_tags` was removed from the signature per integration review feedback (no stage populates this field).

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class ScoredChunk:
    """A chunk with its similarity score and metadata."""
    chunk_id: str
    doc_id: str
    text: str
    score: float
    metadata: dict  # contains canonical_product, source_type, facet, stance, etc.


@dataclass(frozen=True)
class GraphNode:
    """A graph entity with its community assignment."""
    entity_id: str
    title: str
    type: str  # Product, Feature, Concern, Competitor, Segment, Claim
    description: str
    community_id: str | None  # from Leiden at resolution 1.0


@dataclass(frozen=True)
class RetrievalResult:
    """Container for retrieval output: ranked chunks + graph context."""
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
    graph: "nx.Graph | None" = None,
) -> RetrievalResult:
    """Unified retrieval: semantic search + metadata filtering + graph ego-network.

    Args:
        query: Natural language query to search for.
        canonical_product: Product slug to filter by (required).
        facets: Optional list of facet values to filter (e.g., ["camera", "battery"]).
        stances: Optional list of stance values to filter (e.g., ["positive", "mixed"]).
        top_k: Number of final chunks to return.
        chroma_store: ChunksStore instance for vector search.
        graph: NetworkX graph with entity nodes and community_id attributes.

    Returns:
        RetrievalResult with ranked chunks, graph neighbor nodes, and entity IDs.
    """
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `core/indexing/retrieve.py` | Unified retrieval combining semantic search, filtering, entity matching, graph traversal |
| `tests/test_retrieve.py` | Tests for the retrieval module |

---

## Tests FIRST

All tests live in `tests/test_retrieve.py`. Tests require fixtures from section-01 (`chroma_collection`, `sample_chunks`, `sample_graph`), plus additional fixtures specific to retrieval.

### Required Test Fixtures

**`populated_store`**: A `ChunksStore` (using ephemeral ChromaDB client) populated with 5-8 chunks spanning two products, multiple facets, and multiple stances. Example chunks:

- chunk_id="c1", canonical_product="iphone_18", facet="camera", stance="positive", text about iPhone camera quality
- chunk_id="c2", canonical_product="iphone_18", facet="battery", stance="negative", text about battery concerns
- chunk_id="c3", canonical_product="iphone_18", facet="camera", stance="mixed", text about camera comparison
- chunk_id="c4", canonical_product="samsung_s26", facet="camera", stance="positive", text about Samsung camera
- chunk_id="c5", canonical_product="iphone_18", facet="price", stance="negative", text about pricing concerns
- chunk_id="c6", canonical_product="iphone_18", facet="design", stance="positive", text about design improvements
- chunk_id="c7", canonical_product="iphone_18", facet="privacy", stance="positive", text about privacy features

Each chunk must be embedded (via `embed_texts`) and upserted into the store before tests run.

**`retrieval_graph`**: A NetworkX graph with entities matching the chunks above. Nodes should have `community_id` attributes (set by section-07). Example:

- Node "iphone_18": type="Product", description="Apple smartphone", text_unit_ids=["c1","c2","c3","c5","c6","c7"], community_id="comm_0"
- Node "camera": type="Feature", description="48MP camera system", text_unit_ids=["c1","c3"], community_id="comm_0"
- Node "battery": type="Feature", description="Battery and charging", text_unit_ids=["c2"], community_id="comm_0"
- Node "samsung_s26": type="Competitor", description="Samsung flagship", text_unit_ids=["c4"], community_id="comm_1"
- Node "price_concern": type="Concern", description="Pricing too high", text_unit_ids=["c5"], community_id="comm_0"
- Edges: ("iphone_18", "camera"), ("iphone_18", "battery"), ("iphone_18", "samsung_s26"), ("iphone_18", "price_concern")

### tests/test_retrieve.py

```python
"""Tests for core/indexing/retrieve.py -- Unified retrieval layer.

Tests verify the three-phase retrieval pipeline:
1. ChromaDB semantic search with metadata filtering
2. Entity extraction from matched chunks
3. 1-hop graph ego-network traversal
"""


# Test: retrieve returns RetrievalResult with chunks, graph_neighbors, entity_ids
def test_retrieve_returns_retrieval_result(populated_store, retrieval_graph):
    """Call retrieve with a query about cameras and canonical_product='iphone_18'.
    Assert the return type is RetrievalResult.
    Assert result.chunks is a non-empty list of ScoredChunk.
    Assert result.graph_neighbors is a list of GraphNode.
    Assert result.entity_ids is a list of strings."""


# Test: retrieve filters by canonical_product
def test_retrieve_filters_by_product(populated_store, retrieval_graph):
    """Populate store with chunks for 'iphone_18' and 'samsung_s26'.
    Call retrieve with canonical_product='iphone_18'.
    Assert no returned chunk has canonical_product='samsung_s26' in its metadata."""


# Test: retrieve filters by facet list
def test_retrieve_filters_by_facet(populated_store, retrieval_graph):
    """Call retrieve with facets=['camera'].
    Assert all returned chunks have facet='camera' in their metadata.
    Assert chunks with facet='battery' or 'price' are excluded."""


# Test: retrieve filters by stance list
def test_retrieve_filters_by_stance(populated_store, retrieval_graph):
    """Call retrieve with stances=['positive'].
    Assert all returned chunks have stance='positive' in their metadata.
    Assert chunks with stance='negative' or 'mixed' are excluded."""


# Test: retrieve returns top_k chunks ranked by similarity score
def test_retrieve_top_k_limit(populated_store, retrieval_graph):
    """Populate store with many chunks. Call retrieve with top_k=3.
    Assert exactly 3 chunks are returned.
    Assert chunks are sorted by score in descending order (highest similarity first)."""


# Test: retrieve requests top_k * 2 candidates and re-ranks
def test_retrieve_oversamples_candidates(populated_store, retrieval_graph, monkeypatch):
    """Monkeypatch ChunksStore.query to capture the top_k argument passed to it.
    Call retrieve with top_k=5.
    Assert the query to ChromaDB used top_k=10 (i.e., 5 * 2).
    Assert only 5 chunks are returned in the final result."""


# Test: retrieve collects entity IDs from matched chunks
def test_retrieve_collects_entity_ids(populated_store, retrieval_graph):
    """Call retrieve with a query matching chunks that reference known entities.
    Assert result.entity_ids is non-empty.
    Assert the entity IDs are valid node IDs in the graph."""


# Test: retrieve traverses 1-hop graph neighbors for matched entities
def test_retrieve_graph_traversal(populated_store, retrieval_graph):
    """Call retrieve with a query matching chunks that reference 'iphone_18'.
    Assert result.graph_neighbors contains entities directly connected to
    'iphone_18' in the graph (e.g., 'camera', 'battery', 'samsung_s26',
    'price_concern'). Verify the traversal is exactly 1-hop (not deeper)."""


# Test: retrieve returns GraphNode objects with community_id
def test_retrieve_graph_nodes_have_community_id(populated_store, retrieval_graph):
    """Call retrieve. For each GraphNode in result.graph_neighbors, assert
    it has a community_id attribute. Verify that community_id values match
    what was set on the graph nodes (e.g., 'comm_0' or 'comm_1')."""


# Test: retrieve returns empty RetrievalResult when no matches (not an error)
def test_retrieve_no_matches_returns_empty(populated_store, retrieval_graph):
    """Call retrieve with a query that matches nothing (e.g., 'quantum physics')
    and a product with no relevant chunks.
    Assert result.chunks is an empty list.
    Assert result.graph_neighbors is an empty list.
    Assert result.entity_ids is an empty list.
    Assert no exception is raised."""


# Test: retrieve is synchronous (not async)
def test_retrieve_is_synchronous():
    """Import the retrieve function.
    Assert it is not a coroutine function (use inspect.iscoroutinefunction).
    This confirms WS2 can call it via asyncio.to_thread."""
```

---

## Implementation Details

### File: `core/indexing/retrieve.py`

**Purpose:** Provide a single function that combines three retrieval strategies into one result set, giving downstream consumers (WS2 persona generation, analyst synthesis) both ranked text evidence and structural graph context.

### Retrieval Pipeline (Three Phases)

The `retrieve()` function executes three sequential phases:

**Phase 1: Semantic Search with Metadata Filtering**

1. Build a ChromaDB `where` clause from the provided filters:
   - Always include `canonical_product` as an equality filter.
   - If `facets` is provided and non-empty, add a `$in` filter for the facet field.
   - If `stances` is provided and non-empty, add a `$in` filter for the stance field.
   - Combine multiple conditions with `$and`.

   Example filter construction:
   ```python
   where_clauses = [{"canonical_product": {"$eq": canonical_product}}]
   if facets:
       where_clauses.append({"facet": {"$in": facets}})
   if stances:
       where_clauses.append({"stance": {"$in": stances}})

   where = {"$and": where_clauses} if len(where_clauses) > 1 else where_clauses[0]
   ```

2. Query ChromaDB with `top_k * 2` candidates. Oversampling allows re-ranking after entity matching enrichment. Pass the query text to `chroma_store.query()` which handles embedding internally.

3. Convert ChromaDB results into `ScoredChunk` objects. ChromaDB returns distances (lower is more similar for cosine); convert to a similarity score: `score = 1.0 - distance`. Sort by score descending.

**Phase 2: Entity Extraction from Matched Chunks**

1. Collect all chunk IDs from the Phase 1 results.
2. For each entity node in the graph, check if its `text_unit_ids` list overlaps with the matched chunk IDs. If so, add that entity's ID to the result set.
3. This step identifies which entities are grounded in the evidence the query surfaced. The entity matching is done by iterating over graph nodes and checking set intersection -- this is efficient for the expected graph size (hundreds to low thousands of nodes).

   ```python
   matched_chunk_ids = {chunk.chunk_id for chunk in scored_chunks}
   entity_ids = []
   for node_id, data in graph.nodes(data=True):
       node_text_units = set(data.get("text_unit_ids", []))
       if node_text_units & matched_chunk_ids:
           entity_ids.append(node_id)
   ```

**Phase 3: 1-Hop Graph Ego-Network Traversal**

1. For each entity ID collected in Phase 2, traverse the graph to find all direct neighbors (1-hop).
2. Collect the neighbor nodes into `GraphNode` objects, including their `community_id` (set by section-07 during Leiden clustering).
3. Deduplicate neighbors (an entity may be reachable from multiple matched entities).
4. The ego-network provides structural context about the entities -- what they are connected to, what community they belong to, and how they relate to other entities. This context helps WS2 generate more nuanced persona responses.

   ```python
   neighbor_ids = set()
   for eid in entity_ids:
       if graph.has_node(eid):
           for neighbor in graph.neighbors(eid):
               neighbor_ids.add(neighbor)
   # Include the matched entities themselves as well
   all_entity_ids = set(entity_ids) | neighbor_ids

   graph_neighbors = []
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
   ```

**Final Assembly:**

1. Trim the scored chunks to `top_k` (take only the first `top_k` after sorting).
2. Return a `RetrievalResult` with the trimmed chunks, all graph neighbors, and the entity IDs from Phase 2.

### Score Conversion

ChromaDB with cosine distance returns `distances` in the range `[0, 2]` where 0 is identical and 2 is maximally dissimilar. Convert to a similarity score with `score = 1.0 - distance`. For normalized embeddings (which MiniLM produces), cosine distance is in `[0, 1]` so scores will be in `[0, 1]`.

### Graph Loading

The `retrieve()` function accepts the graph as an argument (dependency injection). The caller (WS2 or `run_ingest.py`) is responsible for loading the graph:

```python
import json
import networkx as nx

with open("data/graph/graph.json") as f:
    graph = nx.node_link_graph(json.load(f))
```

The function does NOT load the graph internally. This enables:
- Testing with synthetic graphs (no file I/O in tests)
- Sharing one graph instance across multiple retrieve calls
- Flexibility for WS2 to manage graph lifecycle

### Handling Missing/None Arguments

- If `chroma_store` is None, raise a `ValueError` with a clear message ("ChunksStore is required for retrieval").
- If `graph` is None, skip Phases 2 and 3 entirely. Return only the semantic search results with empty `graph_neighbors` and `entity_ids`. This supports a degraded-mode retrieval when the graph is not yet built.
- If `query` is empty string, return an empty `RetrievalResult` immediately.

---

## Data Classes

Define the three frozen dataclasses at the top of `retrieve.py`:

- `ScoredChunk`: chunk_id (str), doc_id (str), text (str), score (float), metadata (dict)
- `GraphNode`: entity_id (str), title (str), type (str), description (str), community_id (str | None)
- `RetrievalResult`: chunks (list[ScoredChunk]), graph_neighbors (list[GraphNode]), entity_ids (list[str])

Use `@dataclass(frozen=True)` for all three. These are immutable value objects. The `frozen=True` ensures they cannot be modified after creation, following the project's immutability convention.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Empty query string | Return empty `RetrievalResult` immediately (not an error) |
| `chroma_store` is None | Raise `ValueError` with descriptive message |
| `graph` is None | Graceful degradation: return semantic results only, empty graph_neighbors and entity_ids |
| ChromaDB query returns no results | Return `RetrievalResult` with empty chunks, empty graph_neighbors, empty entity_ids |
| Graph node missing expected attributes | Use `.get()` with defaults: title defaults to node_id, type to "unknown", description to "", community_id to None |
| Invalid facet or stance values in filter | Pass through to ChromaDB; if no matching documents exist, empty result is returned |

---

## Configuration

No environment variables are required for this module. All configuration is passed via function arguments:

| Parameter | Source | Notes |
|-----------|--------|-------|
| `top_k` | Function argument | Defaults to 12; oversampling uses `top_k * 2` internally |
| `chroma_store` | Passed by caller | `ChunksStore` instance from section-05 |
| `graph` | Passed by caller | NetworkX graph loaded from `data/graph/graph.json` |
| Oversampling factor | Hardcoded | 2x (retrieve `top_k * 2` candidates from ChromaDB) |

---

## Integration Notes

- **WS2 (AI Engine)** calls `retrieve()` to get evidence for persona generation, simulation rounds, and analyst synthesis. WS2 runs async, so it wraps the call: `result = await asyncio.to_thread(retrieve, query, product, ...)`.
- **Section 09 (CLI demo)** may call `retrieve()` as a smoke test after the full pipeline runs, verifying that the pipeline produced queryable data.
- The `ChunksStore` instance should be created once and reused across multiple `retrieve()` calls within a session. Similarly, the graph should be loaded once from JSON and passed into each call.
- The `community_id` on `GraphNode` comes from the Leiden clustering at resolution 1.0 (set by section-07). If communities have not been computed yet, `community_id` will be `None`.

---

## File Paths Summary

| File | Action | Purpose |
|------|--------|---------|
| `core/indexing/retrieve.py` | Create | Unified retrieval: semantic + metadata + graph ego-network |
| `tests/test_retrieve.py` | Create | Tests for retrieval module |

**Input artifacts consumed (read-only):**
| Artifact | Path | Produced By |
|----------|------|-------------|
| ChromaDB collection | `data/vectors/chroma/` | Section 05 |
| NetworkX graph | `data/graph/graph.json` | Section 06 |
| Community assignments on graph nodes | In-memory (community_id attribute) | Section 07 |

**No output artifacts are produced by this module.** It is a query-time function, not a pipeline stage that writes to disk.