Now I have all the context I need. Let me produce the section content.

# Section 7: Parquet Export + Community Detection

## Overview

This section implements two modules that form Stage 6 of the pipeline:

1. **`core/indexing/graph_parquet.py`** -- Export the in-memory NetworkX knowledge graph to three GraphRAG-compatible Parquet tables (`entities.parquet`, `relationships.parquet`, `text_units.parquet`).
2. **`core/indexing/communities.py`** -- Convert the graph to igraph, run hierarchical Leiden community detection at five resolution levels, filter singletons, and generate Gemini-powered community summaries at the primary resolution level (1.0).

These modules consume the graph built by Section 06 (Extraction + Graph) and produce artifacts consumed by Section 08 (Retrieval) and downstream workstreams (WS2 persona clustering, WS3 graph visualization).

---

## Dependencies

| Dependency | Provided By | What It Provides |
|-----------|-------------|------------------|
| section-01-project-setup | Batch 1 | pyproject.toml with pandas, pyarrow, igraph, leidenalg, networkx, google-genai |
| section-06-extraction-graph | Batch 4 | `data/graph/graph.json` serialized via `networkx.node_link_data()`, enriched JSONL |

**Python packages required** (must be in pyproject.toml from section-01):
- `networkx>=3.0`
- `igraph>=1.0.0`
- `leidenalg>=0.11.0`
- `pandas>=3.0.0`
- `pyarrow`
- `google-genai`
- `pydantic>=2.0`

---

## Files to Create

| File | Purpose |
|------|---------|
| `core/indexing/graph_parquet.py` | Parquet export from NetworkX graph |
| `core/indexing/communities.py` | Leiden community detection + Gemini summaries |
| `tests/test_graph_parquet.py` | Tests for parquet export |
| `tests/test_communities.py` | Tests for community detection |

---

## Schemas (Reference)

The following schemas from the project are relevant to this section. Entity and relationship types are drawn from the extraction schemas owned by WS2:

**Entity types (Literal):** `"Product"`, `"Feature"`, `"Concern"`, `"Competitor"`, `"Segment"`, `"Claim"`

**Relationship types (Literal):** `"MENTIONS"`, `"SUPPORTS"`, `"CONTRADICTS"`, `"COMPARES_TO"`, `"CO_OCCURS_WITH"`

The NetworkX graph stored at `data/graph/graph.json` uses `networkx.node_link_data()` format. Each node has attributes: `title`, `type`, `description`, `text_unit_ids` (list of chunk_ids). Each edge has attributes: `type`, `description`, `weight`, `text_unit_ids`.

---

## Tests FIRST

### tests/test_graph_parquet.py

```python
"""Tests for graph_parquet.py -- Parquet export from NetworkX graph."""

# Test: export_parquet creates entities.parquet with correct columns (id, title, type, description, text_unit_ids)
# Test: export_parquet creates relationships.parquet with correct columns (id, source, target, type, description, weight, text_unit_ids)
# Test: export_parquet creates text_units.parquet with correct columns (id, text, entity_ids)
# Test: parquet files load in pandas without errors
# Test: entity types are valid enum values
# Test: relationship source/target reference existing entity IDs
```

**Test strategy:** Build a small synthetic NetworkX graph in a fixture (3-5 entities, 2-3 relationships), call `export_parquet`, then load the resulting `.parquet` files with pandas and validate column names, types, and referential integrity. Use `tmp_data_dir` (a `tmp_path` fixture) for output.

**Fixture: `sample_graph`**

Build a `networkx.Graph` (undirected) with:
- 3 entity nodes: `("iphone_18", {"title": "iPhone 18", "type": "Product", "description": "Apple smartphone", "text_unit_ids": ["c1", "c2"]})`, `("camera", {"title": "Camera", "type": "Feature", "description": "48MP camera system", "text_unit_ids": ["c1"]})`, `("samsung_s26", {"title": "Samsung S26", "type": "Competitor", "description": "Samsung flagship", "text_unit_ids": ["c2"]})`.
- 2 edges: `("iphone_18", "camera", {"type": "MENTIONS", "description": "iPhone 18 mentions camera", "weight": 0.8, "text_unit_ids": ["c1"]})`, `("iphone_18", "samsung_s26", {"type": "COMPARES_TO", "description": "comparison", "weight": 0.5, "text_unit_ids": ["c2"]})`.

**Fixture: `sample_chunks`** (for text_units cross-referencing)

A list of dicts representing chunk records:
```python
[
    {"chunk_id": "c1", "text": "The iPhone 18 camera is impressive...", "entity_ids": ["iphone_18", "camera"]},
    {"chunk_id": "c2", "text": "Compared to Samsung S26...", "entity_ids": ["iphone_18", "samsung_s26"]},
]
```

**Specific validations:**
- `entities.parquet` has exactly 3 rows and columns `["id", "title", "type", "description", "text_unit_ids"]`.
- `relationships.parquet` has exactly 2 rows and columns `["id", "source", "target", "type", "description", "weight", "text_unit_ids"]`.
- `text_units.parquet` has exactly 2 rows and columns `["id", "text", "entity_ids"]`.
- Every `type` value in entities matches one of the valid entity type literals.
- Every `source` and `target` in relationships matches an `id` in entities.
- All parquet files round-trip through `pd.read_parquet()` without errors.

### tests/test_communities.py

```python
"""Tests for communities.py -- Leiden community detection and Gemini summaries."""

# Test: detect_communities converts NetworkX graph to igraph
# Test: detect_communities runs Leiden at 5 resolution levels [0.1, 0.5, 1.0, 2.0, 5.0]
# Test: detect_communities uses seed=42 for deterministic results
# Test: same graph + same seed produces identical community assignments
# Test: singleton communities (1 node) are filtered out
# Test: community summaries are generated only at resolution 1.0 (not all levels)
# Test: community assignments are stored for all resolution levels
# Test: communities.json contains summaries keyed by community ID
# Test: disconnected graph components are handled (no crash)
```

**Test strategy:** Use the `sample_graph` fixture (same as parquet tests but larger -- add 5-8 nodes with varying connectivity to create meaningful communities). Mock the Gemini client to return canned community summaries. Verify determinism by running twice and asserting identical assignments.

**Fixture: `mock_gemini`**

A mock that replaces the Gemini API call used for community summarization. It should return a canned string summary like `"This community discusses iPhone 18 camera features and comparisons."` for any input. The mock must be injected so no real API calls are made.

**Fixture: `community_graph`**

A larger NetworkX graph with two clear clusters to ensure Leiden produces at least two communities:
- Cluster A: 4 nodes densely connected (e.g., `iphone_18`, `camera`, `battery`, `design` all connected pairwise with weight 1.0).
- Cluster B: 3 nodes densely connected (e.g., `samsung_s26`, `pixel_10`, `oneplus_14` all connected pairwise with weight 1.0).
- 1 bridge edge between clusters with low weight (e.g., `iphone_18` -- `samsung_s26`, weight 0.1).

This topology should produce 2 communities at resolution 1.0 and potentially different groupings at other resolutions.

**Specific validations:**
- `detect_communities` is called with the NetworkX graph and returns community data.
- Output includes `community_assignments.json` with keys for all 5 resolution levels (as strings: `"0.1"`, `"0.5"`, `"1.0"`, `"2.0"`, `"5.0"`).
- Output includes `communities.json` with summaries only for resolution 1.0 communities.
- Singleton filtering: if Leiden assigns a node to a community of size 1, that community does not appear in the output.
- Determinism: two invocations with `seed=42` on the same graph produce byte-identical `community_assignments.json`.
- Disconnected components: add an isolated node to the graph and verify no crash (Leiden handles it; the isolated node forms a singleton and gets filtered).
- The mock Gemini client is called exactly once per non-singleton community at resolution 1.0.
- Each entity node in the graph gets a `community_id` attribute set (at the primary 1.0 resolution).

---

## Implementation Details

### core/indexing/graph_parquet.py

**Function: `export_parquet(graph, chunks, output_dir)`**

```python
def export_parquet(
    graph: nx.Graph,
    chunks: list[dict],
    output_dir: str | Path,
) -> dict[str, Path]:
    """Export NetworkX graph to three GraphRAG-compatible parquet files.

    Args:
        graph: NetworkX graph with entity nodes and relationship edges.
            Nodes have attributes: title, type, description, text_unit_ids.
            Edges have attributes: type, description, weight, text_unit_ids.
        chunks: List of chunk dicts with keys: chunk_id, text, entity_ids.
        output_dir: Directory to write parquet files into (e.g., data/graph/).

    Returns:
        Dict mapping table name to file path:
        {"entities": Path, "relationships": Path, "text_units": Path}
    """
```

**Behavior:**

1. **Load graph** -- If `graph` is a path string, reconstruct from JSON via `nx.node_link_graph(json.load(...))`. If it is already a NetworkX graph object, use directly.

2. **Build entities DataFrame** -- Iterate over `graph.nodes(data=True)`. For each node, extract `id` (the node key, which is a slugified title), `title`, `type`, `description`, `text_unit_ids`. Create a pandas DataFrame and write to `{output_dir}/entities.parquet` via `df.to_parquet()`.

3. **Build relationships DataFrame** -- Iterate over `graph.edges(data=True)`. For each edge, generate a UUID for the `id` column (use `uuid.uuid4().hex[:16]` for a short deterministic-ish ID, or use `uuid.uuid5` seeded on source+target+type for true determinism). Extract `source`, `target`, `type`, `description`, `weight`, `text_unit_ids`. Write to `{output_dir}/relationships.parquet`.

4. **Build text_units DataFrame** -- Use the `chunks` list. For each chunk, extract `id` (chunk_id), `text`, `entity_ids`. Write to `{output_dir}/text_units.parquet`.

5. **Return** dict of paths.

**Important implementation notes:**
- The `text_unit_ids` and `entity_ids` columns contain lists of strings. PyArrow handles `list[str]` natively -- just ensure the pandas column contains Python lists (not joined strings).
- Use `pd.DataFrame(records)` where `records` is a list of dicts.
- Create `output_dir` if it does not exist (`Path(output_dir).mkdir(parents=True, exist_ok=True)`).
- For relationship IDs, prefer `uuid.uuid5(uuid.NAMESPACE_DNS, f"{source}:{target}:{type}")` so the same edge always gets the same ID (idempotent reruns).

### core/indexing/communities.py

**Function: `detect_communities(graph, output_dir, gemini_client=None)`**

```python
def detect_communities(
    graph: nx.Graph,
    output_dir: str | Path,
    gemini_client=None,
) -> dict:
    """Run hierarchical Leiden clustering and generate community summaries.

    Args:
        graph: NetworkX graph with entity nodes and relationship edges.
        output_dir: Directory to write community JSON files (e.g., data/graph/).
        gemini_client: Optional Gemini client for generating community summaries.
            If None, summaries are skipped (useful for testing without API).

    Returns:
        Dict with keys:
        - "assignments": dict mapping resolution (str) to dict of community_id -> list of entity_ids
        - "summaries": dict mapping community_id (str) to summary text (resolution 1.0 only)
        - "num_communities": dict mapping resolution (str) to number of non-singleton communities
    """
```

**Behavior:**

1. **Convert to igraph** -- Use `ig.Graph.from_networkx(graph)`. This preserves node attributes and edge weights. Important: igraph uses integer vertex indices. Map between igraph vertex index and NetworkX node name using the `_nx_name` attribute that `from_networkx` creates.

2. **Run Leiden at 5 resolutions** -- For each resolution in `[0.1, 0.5, 1.0, 2.0, 5.0]`:
   ```python
   partition = la.find_partition(
       ig_graph,
       la.RBConfigurationVertexPartition,
       resolution_parameter=resolution,
       weights="weight",
       seed=42,
       n_iterations=-1,
   )
   ```
   - Extract community assignments from `partition.membership`.
   - Map igraph vertex indices back to NetworkX node names.
   - Filter out singleton communities (communities containing only 1 node).
   - Store as `{resolution_str: {community_id: [entity_id, ...]}}`.

3. **Generate summaries at resolution 1.0 only** -- For each non-singleton community at resolution 1.0:
   - Gather all entity titles, types, and descriptions in the community.
   - Gather all relationships where both source and target are in the community.
   - Construct a prompt for Gemini asking it to summarize the community theme.
   - Call Gemini (via `gemini_client`) and store the summary text.
   - If `gemini_client` is None, store an empty string or placeholder.

4. **Update graph nodes** -- For each entity, set `community_id` attribute to the community ID at resolution 1.0. This is used later by the retrieval module (section-08) to include community context in `GraphNode` results.

5. **Write outputs:**
   - `{output_dir}/communities.json` -- Dict of `{community_id: summary_text}` for resolution 1.0 only.
   - `{output_dir}/community_assignments.json` -- Dict of `{resolution: {community_id: [entity_ids]}}` for all 5 levels.
   - Update `{output_dir}/entities.parquet` with a `community_id` column (primary resolution 1.0 assignment). Read the existing parquet, merge community IDs, write back.

6. **Return** the result dict.

**Gemini prompt for community summarization:**

The prompt should include:
- All entity titles and types in the community.
- All relationship descriptions within the community.
- Instructions to produce a 2-3 sentence summary of the community's theme, focusing on what product aspect or user concern it represents.
- Use `temperature=0.0` for consistency.

**Edge weight handling:**

If the igraph conversion does not automatically pick up the `weight` edge attribute, you may need to explicitly set it:
```python
ig_graph.es["weight"] = [graph.edges[e].get("weight", 1.0) for e in graph.edges()]
```
However, `ig.Graph.from_networkx()` should handle this automatically. Verify in tests.

**Singleton filtering logic:**

After getting `partition.membership`, count members per community. Any community with count == 1 is excluded from the output. The node in that singleton community gets `community_id = None` (or -1) rather than being assigned to a community.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Empty graph (0 nodes) | Return empty assignments and summaries, write empty JSON files |
| Disconnected components | Leiden handles natively; singletons are filtered |
| Gemini rate limit during summarization | Exponential backoff, retry up to 5 times (same pattern as graph_builder.py) |
| Gemini returns empty/invalid summary | Log warning, store empty string for that community |
| Missing weight attribute on edges | Default to `weight=1.0` |
| Parquet write failure (disk full, permissions) | Let exception propagate with clear error message |

---

## Output Artifacts

| Artifact | Path | Format | Consumer |
|----------|------|--------|----------|
| entities.parquet | `data/graph/entities.parquet` | Parquet (pandas/pyarrow) | Section 08, WS2, WS3 |
| relationships.parquet | `data/graph/relationships.parquet` | Parquet | WS2, WS3 |
| text_units.parquet | `data/graph/text_units.parquet` | Parquet | Section 08 |
| communities.json | `data/graph/communities.json` | JSON `{community_id: summary}` | WS2 |
| community_assignments.json | `data/graph/community_assignments.json` | JSON `{resolution: {community_id: [entity_ids]}}` | WS2 |

The `graph.json` file (produced by section-06) is read but not modified by this section. Entity nodes in the in-memory graph get `community_id` attributes added, but the JSON file is not re-serialized here -- the parquet export captures the community assignments.

---

## Integration Notes

- **Section 08 (Retrieval)** reads `entities.parquet` to cross-reference chunk entity IDs and reads the in-memory graph for 1-hop traversal. It expects `community_id` on graph nodes to populate `GraphNode.community_id` in retrieval results.
- **Section 09 (CLI)** calls both `export_parquet()` and `detect_communities()` as Stage 6 in the pipeline sequence. The CLI passes the graph object returned by `build_graph()` (section-06) directly -- no need to re-read from disk.
- The Gemini client used for community summarization is the same client instance used in section-06 for extraction. It should be passed in rather than constructed internally, enabling dependency injection for testing.