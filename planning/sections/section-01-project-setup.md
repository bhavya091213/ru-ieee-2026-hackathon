Now I have all the context I need. Let me generate the section content.

# Section 01: Project Setup

## Overview

This section establishes the complete project scaffold for Workstream 1 (Data Pipeline & Graph Memory) of PanelForge. It creates the `pyproject.toml`, full directory tree, all `__init__.py` files, environment variable configuration, pytest configuration, and shared test fixtures. Every subsequent section depends on this one being complete.

**Project root:** `/Users/bhavyapatel/Documents/Projects/focus-group-agent`

---

## Background

PanelForge is an evidence-grounded synthetic focus group simulator. Workstream 1 builds the data pipeline: from raw URLs to a queryable knowledge graph with semantic retrieval. The pipeline has seven stages (fetch, normalize, chunk, embed/store, extract/graph, communities, retrieval) producing persistent artifacts in a `data/` directory tree. The project uses Python with `uv` as the package manager, `pytest` as the test runner, and Pydantic for all data models.

The runtime is `python-uv`, so all commands use `uv run pytest` for testing and `uv` for dependency management.

---

## Files to Create

### 1. `pyproject.toml`

Located at `/Users/bhavyapatel/Documents/Projects/focus-group-agent/pyproject.toml`.

This file defines the project metadata, all dependencies, dev dependencies, and pytest configuration. The project should be installable in editable mode (`pip install -e .` or `uv pip install -e .`) enabling cross-module imports like `from core.indexing.retrieve import retrieve`.

**Dependencies (all required):**

```
# Core pipeline
trafilatura>=2.0.0
markdownify>=1.2.2
praw>=7.8.1
youtube-transcript-api>=1.2.4
sentence-transformers
chromadb>=1.5.8
networkx>=3.0
igraph>=1.0.0
leidenalg>=0.11.0
pandas>=3.0.0
pyarrow
pydantic>=2.0

# LLM
google-genai

# Dev
pytest
pytest-asyncio
```

**Pytest configuration** (in `[tool.pytest.ini_options]`):

```ini
testpaths = ["tests"]
asyncio_mode = "auto"
```

The `[project]` table should set `name = "panelforge-ws1"`, `version = "0.1.0"`, `requires-python = ">=3.11"`, and include `packages = [{include = "core"}]` or equivalent `[tool.setuptools.packages.find]` configuration so that `core/` is importable as a package.

### 2. Directory Structure

Create the following directory tree with empty `__init__.py` files in every Python package directory:

```
core/
  __init__.py
  ingest/
    __init__.py
  indexing/
    __init__.py
data/
  raw/          (empty dir, add .gitkeep)
  md/           (empty dir, add .gitkeep)
  chunks/       (empty dir, add .gitkeep)
  graph/        (empty dir, add .gitkeep)
  vectors/
    chroma/     (empty dir, add .gitkeep)
  cache/        (empty dir, add .gitkeep)
scripts/
tests/
  __init__.py
  conftest.py
```

All `__init__.py` files should be empty (just a file so Python treats the directory as a package). The `data/` subdirectories need `.gitkeep` files so Git tracks the empty directories. The `data/` directory itself should have a `.gitignore` that ignores everything except `.gitkeep` files and the directory structure (so generated artifacts are not committed).

### 3. `.env.example`

Located at `/Users/bhavyapatel/Documents/Projects/focus-group-agent/.env.example`.

This documents all environment variables the pipeline requires:

```
# Required — Gemini API for entity extraction and community summarization
GEMINI_API_KEY=

# Required — Reddit API credentials for Reddit ingestion
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=panelforge/0.1

# Optional — YouTube Data API for video metadata (transcripts work without it)
YOUTUBE_API_KEY=

# Optional — Determinism
RANDOM_SEED=42
PYTHONHASHSEED=42
TOKENIZERS_PARALLELISM=false
```

### 4. `.env.test`

Located at `/Users/bhavyapatel/Documents/Projects/focus-group-agent/.env.test`.

Minimal env file for running tests without real API credentials:

```
GEMINI_API_KEY=test-key-not-real
REDDIT_CLIENT_ID=test-client-id
REDDIT_CLIENT_SECRET=test-client-secret
REDDIT_USER_AGENT=panelforge-test/0.1
RANDOM_SEED=42
PYTHONHASHSEED=42
TOKENIZERS_PARALLELISM=false
```

### 5. `data/.gitignore`

```
# Ignore all generated data artifacts
*
# But keep the directory structure
!.gitkeep
!.gitignore
!*/
```

---

## Tests FIRST

All shared test fixtures live in `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/conftest.py`. These fixtures are consumed by every subsequent section's tests. The test file also serves as a smoke test that the project scaffold is correctly set up.

### `tests/conftest.py` — Shared Fixtures

The following fixtures must be implemented:

**`tmp_data_dir`** — A temporary directory mimicking the `data/` structure. Uses `pytest`'s `tmp_path` fixture. Creates subdirectories: `raw/`, `md/`, `chunks/`, `graph/`, `vectors/chroma/`, `cache/`. Yields the path, cleanup is automatic via `tmp_path`.

**`sample_chunks`** — Returns a list of pre-built chunk dictionaries (dicts, not Pydantic models) matching the chunk JSONL schema. Include 3-5 sample chunks with realistic text about a fictional product, each with `chunk_id`, `doc_id`, `text`, `section_title`, `char_start`, `char_end`, and `metadata` (containing `canonical_product`, `source_type`, `published_at`). These are plain dicts so they can be used before Pydantic models exist.

**`mock_gemini`** — A `unittest.mock.MagicMock` that returns a canned extraction response when called. The response should be a dictionary matching the `ChunkExtraction` schema shape (entities, relationships, claims, facet, stance, segment_hints, novelty_signals, evidence_score, rumor_confidence, direct_quote_candidates). This lets extraction tests run without hitting the Gemini API.

**`chroma_collection`** — An ephemeral ChromaDB collection (using `chromadb.EphemeralClient()`, not `PersistentClient`) for tests. Creates a collection named `"test_chunks"` with `hnsw:space` set to `"cosine"`. Yields the collection. This avoids writing to disk during tests.

**`sample_graph`** — A pre-built `networkx.Graph` with 5-8 nodes (entities) and 5-10 edges (relationships). Nodes should have attributes: `title`, `type`, `description`, `text_unit_ids`, `community_id`. Edges should have attributes: `type`, `description`, `weight`, `text_unit_ids`. This graph is used by retrieval and community detection tests.

### `tests/test_project_setup.py` — Scaffold Smoke Tests

Create a test file at `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_project_setup.py` with the following test stubs:

```python
"""Smoke tests to verify project scaffold is correctly set up."""


def test_core_package_importable():
    """Importing 'core' should not raise ImportError."""
    # import core


def test_core_ingest_package_importable():
    """Importing 'core.ingest' should not raise ImportError."""
    # import core.ingest


def test_core_indexing_package_importable():
    """Importing 'core.indexing' should not raise ImportError."""
    # import core.indexing


def test_pydantic_available():
    """Pydantic v2 should be installed and importable."""
    # import pydantic
    # assert pydantic.VERSION.startswith("2")


def test_chromadb_available():
    """ChromaDB should be installed and importable."""
    # import chromadb


def test_networkx_available():
    """NetworkX should be installed and importable."""
    # import networkx


def test_sentence_transformers_available():
    """sentence-transformers should be installed and importable."""
    # import sentence_transformers


def test_trafilatura_available():
    """Trafilatura should be installed and importable."""
    # import trafilatura


def test_tmp_data_dir_fixture_creates_subdirs(tmp_data_dir):
    """The tmp_data_dir fixture should create all required subdirectories."""
    # assert (tmp_data_dir / "raw").is_dir()
    # assert (tmp_data_dir / "md").is_dir()
    # assert (tmp_data_dir / "chunks").is_dir()
    # assert (tmp_data_dir / "graph").is_dir()
    # assert (tmp_data_dir / "vectors" / "chroma").is_dir()
    # assert (tmp_data_dir / "cache").is_dir()


def test_sample_chunks_fixture_has_required_fields(sample_chunks):
    """Each sample chunk should have all required schema fields."""
    # for chunk in sample_chunks:
    #     assert "chunk_id" in chunk
    #     assert "doc_id" in chunk
    #     assert "text" in chunk
    #     assert "metadata" in chunk
    #     assert "canonical_product" in chunk["metadata"]


def test_sample_graph_fixture_has_nodes_and_edges(sample_graph):
    """The sample graph should have nodes with attributes and edges."""
    # assert len(sample_graph.nodes) >= 5
    # assert len(sample_graph.edges) >= 5
    # for _, data in sample_graph.nodes(data=True):
    #     assert "title" in data
    #     assert "type" in data


def test_chroma_collection_fixture_uses_cosine(chroma_collection):
    """The ephemeral Chroma collection should be configured for cosine distance."""
    # metadata = chroma_collection.metadata
    # This verifies the collection was created successfully
    # assert chroma_collection.name == "test_chunks"
```

Each test is commented out because the actual imports and assertions depend on the scaffold being built first. The implementer should uncomment the test bodies as part of the RED-GREEN-REFACTOR cycle: uncomment a test, watch it fail (RED), implement the corresponding scaffold piece, watch it pass (GREEN).

---

## Implementation Details

### Step-by-step Implementation Order

1. **Create `pyproject.toml`** at the project root. Define the project metadata, all dependencies, and pytest config. Use `[build-system]` with `setuptools` and `[tool.setuptools.packages.find]` pointing at `core`. Run `uv sync` to install dependencies.

2. **Create the directory tree.** Make all directories listed above. Place empty `__init__.py` in `core/`, `core/ingest/`, `core/indexing/`, and `tests/`. Place `.gitkeep` in every `data/` subdirectory. Create `data/.gitignore`.

3. **Create `.env.example`** and `.env.test`** at the project root.

4. **Create `tests/conftest.py`** with all shared fixtures. The fixture implementations should be straightforward:
   - `tmp_data_dir`: use `tmp_path` and `mkdir` calls
   - `sample_chunks`: return a hardcoded list of dicts
   - `mock_gemini`: use `unittest.mock.MagicMock` with a `return_value` set to a canned dict
   - `chroma_collection`: use `chromadb.EphemeralClient()` and `client.create_collection()`
   - `sample_graph`: use `networkx.Graph()` and `add_node`/`add_edge` calls

5. **Create `tests/test_project_setup.py`** with the smoke tests above (uncommented).

6. **Verify** by running `uv run pytest tests/test_project_setup.py -v` and confirming all tests pass.

### Key Design Decisions

- **`uv` as package manager:** The project uses `uv` (as specified in the section manifest's `runtime: python-uv`). All test commands use `uv run pytest`.
- **Editable install:** The `pyproject.toml` must be configured so `core` is importable as a package. This means `core/__init__.py` exists and the package discovery includes the `core` directory.
- **Ephemeral ChromaDB for tests:** Tests use `chromadb.EphemeralClient()` (in-memory only), never `PersistentClient`, to avoid disk side effects and ensure test isolation.
- **Fixture scope:** All fixtures should use the default function scope (fresh instance per test) unless performance requires otherwise. The `chroma_collection` fixture in particular must be function-scoped to avoid cross-test contamination.
- **No mutation of data directories:** The `data/` tree holds generated artifacts. The `.gitignore` ensures artifacts are not committed while preserving the directory structure via `.gitkeep`.

---

## Dependencies on Other Sections

This section has no upstream dependencies. It is the foundation that all other sections (02 through 09) depend on. Specifically:

- **Section 02 (Web Fetcher)** depends on `core/ingest/` package existing and being importable
- **Section 03 (Reddit/YouTube)** depends on the same
- **Section 04 (Markdown/Chunker)** depends on both `core/ingest/` and `core/indexing/` packages
- **Section 05 (Embedding/Chroma)** depends on `core/indexing/` and the `chroma_collection` fixture
- **Section 06 (Extraction/Graph)** depends on `core/indexing/`, `mock_gemini` and `sample_chunks` fixtures
- **Section 07 (Parquet/Communities)** depends on `core/indexing/` and `sample_graph` fixture
- **Section 08 (Retrieval)** depends on all fixtures
- **Section 09 (CLI/Demo)** depends on `scripts/` directory existing

---

## Verification Checklist

After implementation, confirm the following:

- [ ] `uv sync` completes without errors
- [ ] `uv run python -c "import core; import core.ingest; import core.indexing"` succeeds
- [ ] `uv run pytest tests/test_project_setup.py -v` shows all tests passing
- [ ] All `data/` subdirectories exist with `.gitkeep` files
- [ ] `.env.example` documents all required and optional environment variables
- [ ] `tests/conftest.py` exports all five shared fixtures (`tmp_data_dir`, `sample_chunks`, `mock_gemini`, `chroma_collection`, `sample_graph`)