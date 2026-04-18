Now I have all the context needed. Let me produce the section content.

# Section 06: Entity/Relationship Extraction and Graph Building

## Overview

This section implements Stage 5 of the data pipeline: using Gemini 2.5 Flash to extract structured entities and relationships from each text chunk, then assembling those extractions into a unified NetworkX knowledge graph. The module lives at `core/indexing/graph_builder.py` with tests at `tests/test_graph_builder.py`.

The extraction graph stage is the bridge between raw text chunks (produced by Section 04) and the downstream community detection and retrieval stages (Sections 07 and 08). It produces two key artifacts: an enriched JSONL file with facet/stance metadata per chunk, and a serialized NetworkX graph containing all entities and relationships.

---

## Dependencies

- **Section 01 (Project Setup):** Project structure, pyproject.toml with all dependencies installed, shared test fixtures (`tmp_data_dir`, `mock_gemini`, `sample_chunks`).
- **Section 04 (Markdown Chunker):** Chunk JSONL files at `data/chunks/{product}.jsonl` conforming to the chunk record schema (chunk_id, doc_id, text, section_title, char_start, char_end, metadata).
- **Section 05 (Embedding + ChromaDB):** The `chroma_store.py` module with its `update_metadata(chunk_ids, metadata_updates)` method, used to replace `"unclassified"` sentinel values with real facet/stance values after extraction.

---

## Schemas

The extraction schemas are Pydantic `BaseModel` classes. WS2 owns these schemas (at `apps/api/schemas/chunk.py`), and WS1 imports them for Gemini structured output. For initial development before WS2 delivers them, define local copies in `core/indexing/graph_builder.py` (or a shared schemas module) that can later be replaced with imports.

```python
class ExtractedEntity(BaseModel):
    id: str
    title: str
    type: Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
    description: str

class ExtractedRelationship(BaseModel):
    source: str
    target: str
    type: Literal["MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"]
    description: str
    weight: float

class ChunkExtraction(BaseModel):
    entities: list[ExtractedEntity]
    relationships: list[ExtractedRelationship]
    claims: list[str]
    facet: Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
    stance: Literal["positive", "negative", "mixed", "rumor", "review"]
    segment_hints: list[str]
    novelty_signals: list[str]
    evidence_score: float       # 0-1
    rumor_confidence: float     # 0-1
    direct_quote_candidates: list[str]
```

---

## File Paths

| Purpose | Path |
|---------|------|
| Implementation | `core/indexing/graph_builder.py` |
| Tests | `tests/test_graph_builder.py` |
| Cached extraction responses | `data/cache/{chunk_id}.json` |
| Enriched chunk output | `data/chunks/{product}_enriched.jsonl` |
| Serialized graph | `data/graph/graph.json` |
| Input chunks | `data/chunks/{product}.jsonl` |

---

## Tests (Write First)

All tests go in `tests/test_graph_builder.py`. The tests are organized into two logical groups: extraction tests and graph construction tests. Use the `mock_gemini` and `sample_chunks` fixtures defined in Section 01.

### Extraction Tests

```python
# tests/test_graph_builder.py

# --- Extraction Tests ---

# Test: extract_chunk calls Gemini with temperature=0.0
#   Mock the Gemini client. Call extract_chunk with a sample chunk.
#   Assert the mock was called with temperature=0.0 in the generation config.

# Test: extract_chunk sends ChunkExtraction Pydantic schema as response format
#   Mock the Gemini client. Call extract_chunk.
#   Assert the call includes ChunkExtraction (or its JSON schema) as the response_schema parameter.

# Test: extract_chunk returns valid ChunkExtraction for a sample chunk
#   Use mock_gemini fixture returning a canned valid response.
#   Call extract_chunk. Assert the return type is ChunkExtraction.
#   Assert entities, relationships, facet, stance fields are populated.

# Test: extract_chunk caches responses keyed by chunk_id in data/cache/
#   Call extract_chunk with a sample chunk and tmp_data_dir.
#   Assert a file data/cache/{chunk_id}.json exists after the call.
#   Assert the file content deserializes to a valid ChunkExtraction.

# Test: extract_chunk returns cached result on re-extraction of same chunk_id
#   Call extract_chunk twice with the same chunk_id.
#   Assert the Gemini client was only called once (second call served from cache).

# Test: extract_chunk handles Gemini rate limit with exponential backoff
#   Mock the Gemini client to raise a rate-limit error on the first call,
#   then succeed on the second. Assert extract_chunk retries and returns a result.
#   Assert at least two calls were made to the mock.

# Test: extract_chunk handles invalid schema response - logs chunk_id and skips
#   Mock Gemini to return malformed JSON that does not match ChunkExtraction.
#   Assert extract_chunk returns None (or a sentinel indicating skip).
#   Assert the chunk_id was logged at warning level.

# Test: extraction result includes all WS2 fields: claims, novelty_signals,
#       rumor_confidence, direct_quote_candidates
#   Use mock_gemini returning a full canned response.
#   Assert all four fields are present and correctly typed on the result.
```

### Graph Construction Tests

```python
# --- Graph Construction Tests ---

# Test: build_graph creates NetworkX graph from extraction results
#   Create a list of (chunk_id, ChunkExtraction) tuples with known entities/relationships.
#   Call build_graph. Assert the result is a networkx.Graph (or DiGraph).
#   Assert the graph has nodes and edges.

# Test: entities are merged by (title.lower(), type) - not just title
#   Create two extractions: one with entity ("iPhone", "Product") and one with
#   ("iphone", "Product"). Call build_graph.
#   Assert only one node exists for that entity (case-insensitive merge).
#   Create a third extraction with ("iPhone", "Feature") - different type.
#   Assert this produces a separate node (same title, different type = no merge).

# Test: merged entities combine text_unit_ids from all mentions
#   Create two extractions each mentioning the same entity from different chunk_ids.
#   Call build_graph. Assert the merged node's text_unit_ids contains both chunk_ids.

# Test: merged entities keep the longest description
#   Create two extractions with the same entity but different length descriptions.
#   Call build_graph. Assert the node's description is the longer of the two.

# Test: duplicate edges (same source+target+type) sum weights
#   Create two extractions with the same relationship (same source, target, type)
#   but different weights (e.g., 0.3 and 0.7).
#   Call build_graph. Assert there is one edge with weight 1.0.

# Test: duplicate edges merge text_unit_ids
#   Create two extractions with the same relationship from different chunks.
#   Call build_graph. Assert the edge's text_unit_ids contains both chunk_ids.

# Test: entity IDs are slugified titles
#   Create an extraction with entity title "Battery Life".
#   Call build_graph. Assert the node's ID is "battery_life" or "battery-life"
#   (a URL-safe slug of the title).

# Test: graph is serialized as JSON via node_link_data (not pickle)
#   Call build_graph and then the serialization function.
#   Assert the output file is valid JSON.
#   Assert it can be deserialized with networkx.node_link_graph().
#   Assert no .pkl or .pickle file was created.

# Test: enriched JSONL is written as separate file (not in-place mutation)
#   Provide input chunks from {product}.jsonl.
#   Call the full extraction+build pipeline.
#   Assert {product}_enriched.jsonl exists as a new file.
#   Assert {product}.jsonl is unchanged (compare before/after hash).

# Test: ChromaDB metadata is updated with real facet/stance values
#   Mock the chroma_store.update_metadata function.
#   Run the full extraction+build pipeline.
#   Assert update_metadata was called with the correct chunk_ids and their
#   extracted facet/stance values (replacing "unclassified").
```

---

## Implementation Details

### Module Structure: `core/indexing/graph_builder.py`

The module should expose the following public functions:

```python
def extract_chunk(
    chunk_id: str,
    chunk_text: str,
    gemini_client,
    cache_dir: Path,
) -> ChunkExtraction | None:
    """Extract entities and relationships from a single chunk using Gemini.
    
    Checks cache first. On cache hit, returns deserialized result.
    On cache miss, calls Gemini with temperature=0.0 and ChunkExtraction
    as the response_schema. Caches successful results. Returns None if
    extraction fails (invalid response, etc.).
    """

def build_graph(
    extractions: list[tuple[str, ChunkExtraction]],
) -> nx.Graph:
    """Build a NetworkX graph from a list of (chunk_id, extraction) pairs.
    
    Merges entities by (title.lower(), type). Deduplicates edges by
    (source, target, type) with weight summation. Assigns slugified
    entity IDs.
    """

def run_extraction_pipeline(
    chunks_jsonl_path: Path,
    output_dir: Path,
    gemini_client,
    chroma_store=None,
    canonical_product: str = "",
) -> nx.Graph:
    """Orchestrate the full extraction and graph building pipeline.
    
    1. Read chunks from JSONL
    2. Extract each chunk (with caching and rate limiting)
    3. Build the merged graph
    4. Write enriched JSONL to {product}_enriched.jsonl
    5. Update ChromaDB metadata with facet/stance
    6. Serialize graph to data/graph/graph.json
    7. Return the NetworkX graph
    """
```

### Extraction Behavior

**Gemini API Call:**
- Use `google.genai` client (the `google-genai` package, not the older `google-generativeai`)
- Model: Gemini 2.5 Flash (or the latest available Flash model)
- Set `temperature=0.0` for deterministic extraction
- Pass `ChunkExtraction` as the `response_schema` parameter for structured output
- The prompt should instruct Gemini to identify entities (products, features, concerns, competitors, segments, claims), identify relationships between entities, classify the chunk's facet and stance, and assign an evidence_score

**Rate Limiting:**
- Limit concurrency to approximately 5 concurrent requests (if using async) or sequential with sleep between batches
- On rate limit errors (HTTP 429 or equivalent): exponential backoff, retry up to 5 times
- Use delays between batches to stay within Gemini API quotas

**Response Caching:**
- Cache directory: `data/cache/`
- Cache key: `{chunk_id}.json`
- On cache hit: deserialize JSON to `ChunkExtraction` and return immediately (no API call)
- On cache miss after successful extraction: serialize `ChunkExtraction` to JSON and write to cache
- This enables idempotent reruns without re-incurring API costs

**Error Handling:**
- If Gemini returns a response that does not validate against `ChunkExtraction`: log a warning with the chunk_id, return `None`, and continue to the next chunk
- If Gemini rate-limits: exponential backoff (1s, 2s, 4s, 8s, 16s), retry up to 5 times
- If all retries exhausted: log error with chunk_id, return `None`, continue

### Graph Construction Behavior

**Entity Merging:**
- The merge key is `(title.lower(), type)` -- two entities with the same lowercased title and same type are the same entity
- When merging: union all `text_unit_ids` lists, keep the longest `description`
- Entity node ID: slugified version of the title (lowercase, replace spaces/special chars with underscores, strip non-alphanumeric)

**Edge Deduplication:**
- Edges are keyed by `(source_entity_id, target_entity_id, relationship_type)`
- When duplicates are found: sum the `weight` values, union the `text_unit_ids`, keep the longest `description`

**Node Attributes:**
Each node in the NetworkX graph should have: `title`, `type`, `description`, `text_unit_ids` (list of chunk_ids that mention this entity), and `id` (the slugified title).

**Edge Attributes:**
Each edge should have: `type`, `description`, `weight`, `text_unit_ids`.

### Post-Extraction Outputs

**Enriched JSONL (`data/chunks/{product}_enriched.jsonl`):**
- Read the original chunk JSONL records
- For each chunk that has an extraction result, add fields: `facet`, `stance`, `claims`, `novelty_signals`, `rumor_confidence`, `direct_quote_candidates`, `evidence_score`
- Chunks that failed extraction keep their original fields with no enrichment fields added
- Write to a NEW file (`_enriched.jsonl`), never mutate the original chunk file

**ChromaDB Metadata Update:**
- After all extractions complete, collect a mapping of `chunk_id -> {facet: ..., stance: ...}` from successful extractions
- Call `chroma_store.update_metadata(chunk_ids, metadata_updates)` to replace `"unclassified"` sentinels with real values
- This depends on the `update_metadata` method from Section 05

**Graph Serialization (`data/graph/graph.json`):**
- Use `networkx.node_link_data(graph)` to convert the graph to a JSON-serializable dict
- Write as JSON with `json.dump()` to `data/graph/graph.json`
- Do NOT use pickle (security risk, fragile across Python versions)
- The graph can be reconstructed later with `networkx.node_link_graph(data)`

### Extraction Prompt Guidance

The prompt sent to Gemini should include:
- The chunk text
- Instructions to extract entities of types: Product, Feature, Concern, Competitor, Segment, Claim
- Instructions to identify relationships of types: MENTIONS, SUPPORTS, CONTRADICTS, COMPARES_TO, CO_OCCURS_WITH
- Instructions to classify the chunk into one facet (camera, battery, price, design, privacy, ecosystem, other) and one stance (positive, negative, mixed, rumor, review)
- Instructions to provide an evidence_score (0-1) indicating how informative the chunk is
- Instructions to identify claims, segment_hints, novelty_signals, rumor_confidence, and direct_quote_candidates
- The canonical product name for context

The exact prompt wording is an implementation detail, but it should be clear and structured to maximize extraction quality at temperature 0.

---

## Configuration

| Setting | Source | Default |
|---------|--------|---------|
| `GEMINI_API_KEY` | Environment variable | Required (raise on missing) |
| Rate limit concurrency | Hardcoded | ~5 concurrent requests |
| Max retries on rate limit | Hardcoded | 5 |
| Cache directory | Convention | `data/cache/` |
| Graph output | Convention | `data/graph/graph.json` |

---

## Error Handling Summary

| Error | Handling |
|-------|----------|
| Gemini rate limit (429) | Exponential backoff (1s base), retry up to 5 times |
| Gemini returns invalid schema | Log warning with chunk_id, skip chunk, continue |
| Gemini returns empty response | Treat as invalid, skip chunk |
| Missing GEMINI_API_KEY | Raise immediately with clear error message |
| Cache read failure (corrupt JSON) | Log warning, re-extract from API |
| Network error during Gemini call | Retry with backoff (same as rate limit) |

---

## Implementation Checklist

1. Define or import the Pydantic schemas (`ExtractedEntity`, `ExtractedRelationship`, `ChunkExtraction`)
2. Write all tests in `tests/test_graph_builder.py` (they should fail initially)
3. Implement `extract_chunk` with caching, rate limiting, and error handling
4. Implement `build_graph` with entity merging and edge deduplication
5. Implement `run_extraction_pipeline` orchestrating the full flow
6. Implement enriched JSONL writer (new file, no mutation of original)
7. Implement ChromaDB metadata update call
8. Implement graph serialization via `node_link_data` to JSON
9. Run all tests and verify they pass
10. Verify cache files are created in `data/cache/`
11. Verify `graph.json` can round-trip through `node_link_data`/`node_link_graph`