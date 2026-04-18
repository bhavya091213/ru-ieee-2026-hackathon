No previous sections have been written yet. I now have all the context needed to write this section. Let me produce the content.

# Section 5: Embedding + ChromaDB Vector Store

## Overview

This section implements Stage 4 of the data pipeline: computing vector embeddings for text chunks and storing them in a persistent ChromaDB collection. It produces two modules:

- **`core/indexing/embed.py`** -- Wraps `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional) with singleton model loading and batched encoding.
- **`core/indexing/chroma_store.py`** -- Manages a ChromaDB `PersistentClient` collection named `"chunks"` with cosine distance, upsert-based population, metadata filtering queries, and metadata update support.

Together these modules power the vector storage layer that the retrieval stage (section-08) queries.

## Dependencies on Other Sections

| Section | What it provides | What this section needs from it |
|---------|-----------------|-------------------------------|
| section-01-project-setup | `pyproject.toml` with `sentence-transformers`, `chromadb` deps; directory scaffolding; shared test fixtures (`tmp_data_dir`, `sample_chunks`, `chroma_collection`) | Dependencies installed; `core/indexing/__init__.py` exists; `data/vectors/chroma/` directory exists |
| section-04-markdown-chunker | `core/indexing/chunk.py` producing JSONL chunk records | Chunk records as input (schema: `chunk_id`, `doc_id`, `text`, `section_title`, `char_start`, `char_end`, `metadata`) |

## Chunk Record Schema (Input)

Each chunk record arriving from section-04 follows this structure:

```json
{
  "chunk_id": "a3f8c1d2e4b5f6a7",
  "doc_id": "doc_appleinsider_a3f8c1",
  "text": "...",
  "section_title": "Camera improvements",
  "char_start": 1200,
  "char_end": 1850,
  "metadata": {
    "canonical_product": "iphone_18",
    "source_type": "web_article",
    "published_at": "2026-04-17"
  }
}
```

Note: `facet` and `stance` are NOT present at this stage. They are populated after entity extraction (section-06) completes.

---

## Tests First

All tests live under `tests/`. Create two test files for this section.

### tests/test_embed.py

```python
"""Tests for core/indexing/embed.py — MiniLM embedding wrapper."""


# Test: embed_texts returns 384-dim vectors for a list of strings
def test_embed_texts_returns_384_dim_vectors():
    """Call embed_texts with 2-3 short sentences. Assert each returned vector
    has exactly 384 dimensions. Assert the return value is a list of lists (or
    list of numpy arrays) with length equal to the input length."""


# Test: embed_texts handles empty list input (returns empty list)
def test_embed_texts_empty_input():
    """Call embed_texts with an empty list. Assert it returns an empty list
    without errors (no model invocation should occur)."""


# Test: embed_texts uses batch_size=256
def test_embed_texts_batch_size(monkeypatch):
    """Monkeypatch the model's encode method to capture the batch_size kwarg.
    Call embed_texts with a small list. Assert encode was called with
    batch_size=256."""


# Test: model is loaded once and reused across calls (singleton pattern)
def test_embed_model_singleton():
    """Call embed_texts twice. Assert the underlying SentenceTransformer
    instance is the same object (use `is` identity check). This confirms
    the model is cached, not re-loaded on every call."""


# Test: embedding is deterministic — same text produces same vector
def test_embed_deterministic():
    """Call embed_texts twice with the same input string. Assert the two
    resulting vectors are element-wise equal (within floating-point tolerance)."""
```

### tests/test_chroma_store.py

```python
"""Tests for core/indexing/chroma_store.py — ChromaDB collection management.

All tests use an ephemeral ChromaDB client (not PersistentClient) to avoid
filesystem side effects. The shared fixture `chroma_collection` from conftest
provides this.
"""

import pytest


# Test: create_collection initializes with cosine distance metric
def test_create_collection_cosine_metric(tmp_path):
    """Instantiate ChunksStore pointing at tmp_path. Inspect the underlying
    collection's metadata to confirm hnsw:space is 'cosine'."""


# Test: populate uses upsert (not add) for idempotent writes
def test_populate_upsert_idempotent(tmp_path):
    """Populate the store with 3 chunks. Populate again with the same 3 chunks
    (same IDs). Assert the collection count is still 3 (not 6). This confirms
    upsert semantics."""


# Test: populate stores chunk text as document and metadata as metadata
def test_populate_stores_text_and_metadata(tmp_path):
    """Populate with a known chunk. Query by its ID. Assert the returned
    document matches the original text, and returned metadata contains
    canonical_product and source_type."""


# Test: initial facet and stance metadata are "unclassified" (not None)
def test_initial_facet_stance_unclassified(tmp_path):
    """Populate a chunk without providing facet/stance. Retrieve it and assert
    metadata['facet'] == 'unclassified' and metadata['stance'] == 'unclassified'.
    This avoids ChromaDB's inconsistent None handling."""


# Test: query returns results filtered by canonical_product
def test_query_filter_by_product(tmp_path):
    """Populate chunks for two different products. Query filtering by one
    product. Assert only chunks from that product are returned."""


# Test: query returns results filtered by facet
def test_query_filter_by_facet(tmp_path):
    """Populate chunks with different facet values. Query filtering by a
    specific facet. Assert only matching chunks are returned."""


# Test: query returns results filtered by stance
def test_query_filter_by_stance(tmp_path):
    """Populate chunks with different stance values. Query filtering by a
    specific stance. Assert only matching chunks are returned."""


# Test: query returns correct number of results (top_k)
def test_query_top_k(tmp_path):
    """Populate 10 chunks. Query with top_k=3. Assert exactly 3 results are
    returned."""


# Test: update_metadata replaces "unclassified" with real facet/stance values
def test_update_metadata_replaces_sentinel(tmp_path):
    """Populate a chunk (facet='unclassified'). Call update_metadata to set
    facet='camera', stance='positive'. Retrieve the chunk and assert the
    new values are present."""


# Test: collection persists across client re-initialization (PersistentClient)
def test_persistence_across_reinit(tmp_path):
    """Create a ChunksStore at tmp_path, populate with data. Create a NEW
    ChunksStore instance at the same tmp_path. Query and assert the data is
    still there. This validates PersistentClient behavior."""
```

---

## Implementation Details

### File: `core/indexing/embed.py`

**Purpose:** Wrap sentence-transformers to produce embeddings for chunk text.

**Key design decisions:**

1. **Model:** `sentence-transformers/all-MiniLM-L6-v2` producing 384-dimensional vectors. This is a small, fast model appropriate for the 1-2K chunk corpus scale.

2. **Singleton pattern:** The `SentenceTransformer` model is expensive to load (~100MB). Use a module-level cache so the model is loaded exactly once per process. A simple approach is a module-level variable guarded by a check, or `functools.lru_cache` on a loader function.

3. **Batch encoding:** Pass `batch_size=256` to `model.encode()`. For 1-2K chunks this means roughly 4-8 batches, which is efficient.

4. **Truncation:** The model's native token limit is 256 word pieces. Sentence-transformers handles truncation automatically -- no preprocessing needed.

5. **Return type:** Return a list of lists of floats (or numpy arrays). ChromaDB accepts both formats.

**Public API (signature stubs):**

```python
def embed_texts(texts: list[str]) -> list[list[float]]:
    """Encode a list of texts into 384-dim embedding vectors.

    Uses all-MiniLM-L6-v2 with batch_size=256. Model is loaded once
    and cached for subsequent calls.

    Args:
        texts: List of text strings to embed. May be empty.

    Returns:
        List of embedding vectors, one per input text. Each vector
        is a list of 384 floats.
    """
```

**Error handling:**

- If the model fails to download (no internet, disk full), raise immediately with a clear message suggesting the user verify their internet connection and disk space.
- Empty input list returns empty output list without invoking the model.

---

### File: `core/indexing/chroma_store.py`

**Purpose:** Manage the ChromaDB persistent collection for chunk storage and retrieval.

**Key design decisions:**

1. **Client type:** `chromadb.PersistentClient` at path `data/vectors/chroma/`. This persists the index to disk automatically -- no manual save/load needed.

2. **Collection configuration:** Collection name is `"chunks"`. Critical HNSW settings:
   - `hnsw:space` = `"cosine"` -- the default is L2 which is wrong for normalized text embeddings.
   - `hnsw:ef_construction` = 200 -- higher than default for better index quality.
   - `hnsw:ef_search` = 150 -- higher than default for better recall at query time.
   Use `get_or_create_collection()` to make initialization idempotent.

3. **Upsert semantics:** Always use `.upsert()`, never `.add()`. ChromaDB's `.add()` silently ignores duplicate IDs which masks bugs. `.upsert()` overwrites if the ID exists, which is the correct idempotent behavior for a pipeline that may be re-run.

4. **Sentinel metadata values:** Set `facet` and `stance` to the string `"unclassified"` on initial population, NOT to `None`. ChromaDB's metadata handling of `None` values is inconsistent across versions (sometimes stored, sometimes filtered out, sometimes causes errors). Using a string sentinel avoids all of these issues. After extraction (section-06) completes, `update_metadata()` replaces the sentinels with actual values.

5. **Metadata keys stored:** `canonical_product`, `source_type`, `published_at`, `facet`, `stance`, `doc_id`.

**Public API (signature stubs):**

```python
class ChunksStore:
    """Manages a ChromaDB persistent collection for chunk embeddings.

    Usage:
        store = ChunksStore(persist_dir="data/vectors/chroma")
        store.populate(chunks, embeddings)
        results = store.query("search text", filters={"facet": "camera"}, top_k=10)
        store.update_metadata(["chunk_id_1"], [{"facet": "battery", "stance": "positive"}])
    """

    def __init__(self, persist_dir: str):
        """Initialize PersistentClient and get-or-create the 'chunks' collection
        with cosine distance and HNSW tuning parameters."""

    def populate(self, chunks: list[dict], embeddings: list[list[float]]) -> None:
        """Upsert chunks and their embeddings into the collection.

        Args:
            chunks: List of chunk dicts with keys: chunk_id, doc_id, text, metadata.
            embeddings: Corresponding embedding vectors (same length as chunks).

        Each chunk's text is stored as the ChromaDB document. Metadata stored:
        canonical_product, source_type, published_at, doc_id, facet ("unclassified"),
        stance ("unclassified").
        """

    def query(
        self,
        text: str | None = None,
        embedding: list[float] | None = None,
        filters: dict | None = None,
        top_k: int = 12,
    ) -> dict:
        """Query the collection by text or embedding with optional metadata filters.

        Args:
            text: Query text (will be embedded internally if no embedding provided).
            embedding: Pre-computed query embedding (takes precedence over text).
            filters: ChromaDB where clause dict, e.g. {"facet": "camera"}.
            top_k: Number of results to return.

        Returns:
            Dict with keys: ids, documents, metadatas, distances — matching
            ChromaDB's query result format.
        """

    def update_metadata(
        self, chunk_ids: list[str], metadata_updates: list[dict]
    ) -> None:
        """Update metadata for existing chunks (e.g., replacing 'unclassified'
        sentinels with real facet/stance after extraction).

        Args:
            chunk_ids: List of chunk IDs to update.
            metadata_updates: List of metadata dicts to merge (same length).
        """
```

**Query filtering notes:**

ChromaDB where-clauses support `$eq`, `$in`, `$and`, etc. For the `query` method, callers from retrieve.py will pass filters like:

```python
{"$and": [
    {"canonical_product": {"$eq": "iphone_18"}},
    {"facet": {"$in": ["camera", "battery"]}}
]}
```

The `query` method should pass this through to ChromaDB's `where` parameter unchanged. The method should not try to build the where clause internally -- leave that to the caller.

**Embedding at query time:** The `query` method accepts either `text` or `embedding`. When `text` is provided and `embedding` is not, the method should call `embed_texts([text])[0]` to get the query vector. This creates a dependency on `embed.py` from within `chroma_store.py`. The alternative is to always require the caller to pre-embed, but co-locating the convenience method is more ergonomic.

---

## Integration: Wiring Embed + Store Together

The typical usage in the pipeline (run by section-09's `run_ingest.py`) is:

```python
# After chunking produces chunk records...
from core.indexing.embed import embed_texts
from core.indexing.chroma_store import ChunksStore

# 1. Embed all chunk texts in batch
texts = [chunk["text"] for chunk in chunks]
embeddings = embed_texts(texts)

# 2. Store in ChromaDB
store = ChunksStore(persist_dir="data/vectors/chroma")
store.populate(chunks, embeddings)
```

This two-step pattern keeps embedding and storage decoupled. The embedding module knows nothing about ChromaDB; the store module optionally imports embed for query-time convenience but does not require it for population.

---

## Configuration and Environment

No environment variables are required for this section. The MiniLM model is downloaded automatically by sentence-transformers on first use (cached in `~/.cache/torch/sentence_transformers/`).

Suppress tokenizer parallelism warnings by setting `TOKENIZERS_PARALLELISM=false` in the environment (handled by section-01's `.env.example`).

---

## Error Handling

| Component | Error Type | Handling |
|-----------|-----------|----------|
| embed.py | Model download failure (no internet, disk full) | Raise immediately with clear error message suggesting internet/disk check |
| embed.py | Empty input list | Return empty list, do not invoke model |
| chroma_store.py | Collection already exists | Use `get_or_create_collection` -- idempotent by design |
| chroma_store.py | Duplicate chunk IDs on populate | Handled by `upsert` semantics -- overwrites existing |
| chroma_store.py | Query with no matches | Return empty result dict (not an error) |
| chroma_store.py | Invalid metadata filter | Let ChromaDB raise its own error -- do not swallow |

---

## File Paths Summary

| File | Action | Purpose |
|------|--------|---------|
| `core/indexing/embed.py` | Create | MiniLM embedding wrapper with singleton model caching |
| `core/indexing/chroma_store.py` | Create | ChromaDB PersistentClient collection manager |
| `tests/test_embed.py` | Create | Tests for embedding module |
| `tests/test_chroma_store.py` | Create | Tests for ChromaDB store module |
| `data/vectors/chroma/` | Directory | ChromaDB persistence directory (created by section-01) |