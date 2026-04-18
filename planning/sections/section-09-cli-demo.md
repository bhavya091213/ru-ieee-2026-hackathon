Now I have all the context needed. Let me generate the section content.

# Section 09: CLI Entry Point and Demo Corpus

## Overview

This section implements the final two pipeline scripts that tie together all previous stages:

1. **`scripts/run_ingest.py`** -- A command-line entry point that runs all 6 pipeline stages sequentially: fetch sources, write Markdown, chunk, embed + store in ChromaDB, extract entities + build graph, export Parquet + detect communities. Accepts a `--product` argument and optional source arguments.

2. **`scripts/bootstrap_demo_project.py`** -- A self-contained script that pre-ingests a demo product corpus. It includes seed URLs and pre-fetched `.md` fallback files so the demo works even without API credentials. It produces a `data/demo_manifest.json` summarizing what was created.

These scripts are the user-facing entry points for the entire WS1 data pipeline. They are the last section to implement because they depend on every upstream module being functional.

**Project root:** `/Users/bhavyapatel/Documents/Projects/focus-group-agent`

---

## Dependencies

| Section | What It Provides | What This Section Needs |
|---------|-----------------|------------------------|
| section-01-project-setup | Project scaffold, `pyproject.toml`, directory tree, `scripts/` directory | All dependencies installed, `data/` subdirectories exist |
| section-02-web-fetcher | `core/ingest/fetch.py` with `fetch_urls()` | Fetch web articles from seed URLs |
| section-03-reddit-youtube | `core/ingest/reddit.py` with `fetch_reddit()`, `core/ingest/youtube.py` with `fetch_youtube()` | Fetch Reddit/YouTube sources |
| section-04-markdown-chunker | `core/ingest/md_writer.py` with `write_markdown()`, `core/indexing/chunk.py` with `chunk_documents()` | Normalize sources to Markdown, split into chunks |
| section-05-embedding-chroma | `core/indexing/embed.py` with `embed_texts()`, `core/indexing/chroma_store.py` with `ChunksStore` | Embed chunks and populate vector store |
| section-06-extraction-graph | `core/indexing/graph_builder.py` with `extract_chunk()`, `build_graph()`, `run_extraction_pipeline()` | Extract entities/relationships, build knowledge graph |
| section-07-parquet-communities | `core/indexing/graph_parquet.py` with `export_parquet()`, `core/indexing/communities.py` with `detect_communities()` | Export Parquet tables, run Leiden community detection |
| section-08-retrieval | `core/indexing/retrieve.py` with `retrieve()` | Verify the full pipeline produces a queryable corpus (used in bootstrap verification) |

**This section blocks:** Nothing. It is the final section in the pipeline.

---

## Files to Create

| File | Purpose |
|------|---------|
| `scripts/run_ingest.py` | CLI entry point that orchestrates all 6 pipeline stages |
| `scripts/bootstrap_demo_project.py` | Pre-ingests a demo product corpus with fallback data |
| `tests/test_run_ingest.py` | Tests for the CLI entry point |
| `tests/test_bootstrap_demo.py` | Tests for the demo bootstrap script |

All paths are relative to `/Users/bhavyapatel/Documents/Projects/focus-group-agent/`.

---

## Pipeline Stages (Reference)

The CLI runs these 6 stages sequentially. Understanding what each stage does is essential for wiring them together:

1. **Stage 1: Multi-Source Fetching** -- `fetch_urls()`, `fetch_reddit()`, `fetch_youtube()` download raw content from seed URLs, Reddit subreddits, and YouTube videos. Each returns a list of dicts with text and metadata.

2. **Stage 2: Markdown Normalization** -- `write_markdown()` converts each fetched result into a canonical `.md` file with YAML frontmatter in `data/md/`. Returns the `doc_id` for each written file.

3. **Stage 3: Chunking** -- `chunk_documents()` reads all `.md` files in `data/md/`, splits into ~500-token chunks with 50-token overlap, and writes JSONL to `data/chunks/{product}.jsonl`. Returns a list of chunk dicts.

4. **Stage 4: Embedding + Vector Store** -- `embed_texts()` computes 384-dim MiniLM vectors for all chunk texts. `ChunksStore.populate()` upserts chunks and embeddings into ChromaDB at `data/vectors/chroma/`.

5. **Stage 5: Extraction + Graph** -- `run_extraction_pipeline()` calls Gemini for each chunk to extract entities/relationships, builds a merged NetworkX graph, writes enriched JSONL to `data/chunks/{product}_enriched.jsonl`, updates ChromaDB metadata with real facet/stance values, and serializes the graph to `data/graph/graph.json`.

6. **Stage 6: Parquet + Communities** -- `export_parquet()` writes `entities.parquet`, `relationships.parquet`, `text_units.parquet` to `data/graph/`. `detect_communities()` runs hierarchical Leiden clustering at 5 resolutions and generates Gemini-powered community summaries, writing `communities.json` and `community_assignments.json`.

---

## Tests FIRST

### tests/test_run_ingest.py

```python
"""Tests for scripts/run_ingest.py — CLI entry point for the full ingest pipeline."""

import pytest


# Test: run_ingest accepts --product argument (required)
def test_run_ingest_requires_product_arg():
    """Invoke the CLI argument parser with no arguments.
    Assert it raises SystemExit (argparse error for missing required arg).
    Invoke with --product iphone_18. Assert it parses successfully and
    the product attribute is set to 'iphone_18'."""


# Test: run_ingest creates canonical_product slug (lowercase, underscored)
def test_run_ingest_slugifies_product():
    """Pass --product 'iPhone 18 Pro' to the argument parser.
    Assert the resulting canonical_product is 'iphone_18_pro'
    (lowercased, spaces replaced with underscores, special chars stripped)."""


# Test: run_ingest runs all 6 stages sequentially
def test_run_ingest_runs_all_stages(tmp_path, monkeypatch):
    """Mock all stage functions (fetch_urls, write_markdown, chunk_documents,
    embed_texts, ChunksStore.populate, run_extraction_pipeline, export_parquet,
    detect_communities). Call run_pipeline() with a minimal config pointing
    at tmp_path. Assert each mock was called exactly once and in the correct
    order (use a shared call_order list that each mock appends its name to)."""


# Test: run_ingest prints summary with counts (sources, chunks, entities, communities)
def test_run_ingest_prints_summary(tmp_path, monkeypatch, capsys):
    """Mock all stages to return known counts (e.g., 5 sources, 20 chunks,
    15 entities, 3 communities). Call run_pipeline(). Capture stdout via capsys.
    Assert the output contains all four count values."""


# Test: run_ingest handles missing optional args (no URLs, no subreddit, no youtube)
def test_run_ingest_no_optional_sources():
    """Parse args with only --product and no --urls, --subreddit, or --youtube.
    Assert parsing succeeds. Assert the urls list is empty, subreddit is None,
    youtube is None. The pipeline should still run (may produce 0 sources if
    no seed URLs are provided)."""
```

### tests/test_bootstrap_demo.py

```python
"""Tests for scripts/bootstrap_demo_project.py — Demo corpus bootstrap."""

import pytest


# Test: bootstrap creates data/demo_manifest.json with artifact counts
def test_bootstrap_creates_manifest(tmp_path, monkeypatch):
    """Mock all pipeline stages. Call bootstrap_demo() with data_dir=tmp_path.
    Assert data/demo_manifest.json exists. Load the JSON and assert it contains
    keys: source_count, chunk_count, entity_count, community_count."""


# Test: bootstrap populates Chroma collection (non-empty)
def test_bootstrap_populates_chroma(tmp_path, monkeypatch):
    """Mock the fetch stages to return pre-built content (or use fallback .md files).
    Mock Gemini calls. Run bootstrap_demo() with data_dir=tmp_path.
    Assert ChunksStore at the persist directory contains at least 1 document
    after bootstrap completes."""


# Test: bootstrap creates valid graph parquet files
def test_bootstrap_creates_parquet(tmp_path, monkeypatch):
    """Mock the fetch and Gemini stages. Run bootstrap_demo().
    Assert entities.parquet, relationships.parquet, and text_units.parquet
    exist under data/graph/. Load each with pandas and assert they have
    at least 1 row."""


# Test: bootstrap generates community summaries
def test_bootstrap_generates_communities(tmp_path, monkeypatch):
    """Mock Gemini to return canned summaries. Run bootstrap_demo().
    Assert communities.json exists under data/graph/ and contains at
    least one community summary entry."""


# Test: bootstrap works with pre-fetched .md fallback files (no API credentials needed)
def test_bootstrap_uses_fallback_md(tmp_path, monkeypatch):
    """Set all API credential env vars to empty strings (simulating no credentials).
    Place pre-fetched .md files in the expected fallback directory.
    Run bootstrap_demo(). Assert the pipeline completes without errors
    and produces chunks from the fallback files."""


# Test: full bootstrap completes in under 2 minutes
@pytest.mark.timeout(120)
def test_bootstrap_completes_within_timeout(tmp_path, monkeypatch):
    """Mock all external API calls (Gemini, Reddit, YouTube, web fetch).
    Run the full bootstrap_demo(). Assert it completes (no timeout).
    This test verifies there are no infinite loops or excessive processing."""
```

---

## Implementation Details

### scripts/run_ingest.py

**Purpose:** A CLI script that accepts a product name and optional source arguments, then runs all 6 pipeline stages in sequence with progress logging.

**Argument Parser:**

The script uses `argparse` with the following arguments:

- `--product` (required, `str`) -- The product name. Gets slugified into a `canonical_product` (lowercase, spaces to underscores, strip non-alphanumeric except underscores).
- `--urls` (optional, `list[str]`, `nargs="*"`) -- Seed web article URLs to fetch.
- `--subreddit` (optional, `str`) -- Reddit subreddit to search (e.g., `"apple"`).
- `--reddit-query` (optional, `str`) -- Search query within the subreddit.
- `--youtube` (optional, `list[str]`, `nargs="*"`) -- YouTube video URLs or IDs to fetch transcripts from.
- `--data-dir` (optional, `str`, default `"data"`) -- Base data directory.
- `--skip-extraction` (optional, `bool`, flag) -- Skip the Gemini extraction stage (useful when no `GEMINI_API_KEY` is available).

**Slugification function:**

```python
def slugify_product(name: str) -> str:
    """Convert a product name to a canonical slug.
    
    'iPhone 18 Pro' -> 'iphone_18_pro'
    Lowercase, replace spaces/hyphens with underscores, strip non-alphanumeric.
    """
```

**Main pipeline function:**

```python
def run_pipeline(
    canonical_product: str,
    urls: list[str] | None = None,
    subreddit: str | None = None,
    reddit_query: str | None = None,
    youtube_ids: list[str] | None = None,
    data_dir: str = "data",
    skip_extraction: bool = False,
) -> dict:
    """Run the full 6-stage ingest pipeline.
    
    Args:
        canonical_product: Slugified product name.
        urls: Optional list of web URLs to fetch.
        subreddit: Optional Reddit subreddit name.
        reddit_query: Optional Reddit search query.
        youtube_ids: Optional YouTube video URLs/IDs.
        data_dir: Base data directory path.
        skip_extraction: If True, skip Stage 5 (Gemini extraction).
    
    Returns:
        Summary dict with keys: source_count, chunk_count, entity_count,
        community_count, canonical_product.
    """
```

**Pipeline orchestration logic** (pseudocode for the run_pipeline function body):

1. **Stage 1 -- Fetch Sources:**
   - Initialize an empty `all_results` list.
   - If `urls` is provided and non-empty, call `fetch_urls(urls, canonical_product, data_dir)` and extend `all_results`.
   - If `subreddit` is provided, call `fetch_reddit(subreddit, reddit_query, canonical_product)` and extend `all_results`.
   - If `youtube_ids` is provided and non-empty, call `fetch_youtube(youtube_ids, canonical_product)` and extend `all_results`.
   - Log: `"Stage 1 complete: {len(all_results)} sources fetched"`

2. **Stage 2 -- Write Markdown:**
   - For each result in `all_results`, call `write_markdown(result["text"], result, canonical_product, data_dir, result.get("source_type", "web_article"))`.
   - Log: `"Stage 2 complete: {count} Markdown files written"`

3. **Stage 3 -- Chunk:**
   - Call `chunk_documents(md_dir=f"{data_dir}/md", output_path=f"{data_dir}/chunks/{canonical_product}.jsonl", canonical_product=canonical_product)`.
   - Capture returned chunks list.
   - Log: `"Stage 3 complete: {len(chunks)} chunks created"`

4. **Stage 4 -- Embed + Store:**
   - Extract texts: `texts = [c["text"] for c in chunks]`
   - Call `embeddings = embed_texts(texts)`
   - Create store: `store = ChunksStore(persist_dir=f"{data_dir}/vectors/chroma")`
   - Call `store.populate(chunks, embeddings)`
   - Log: `"Stage 4 complete: {len(chunks)} chunks embedded and stored"`

5. **Stage 5 -- Extract + Build Graph (conditional):**
   - If `skip_extraction` is True, log a warning and skip to Stage 6 with an empty graph.
   - Otherwise, initialize the Gemini client (using `GEMINI_API_KEY` from environment).
   - Call `graph = run_extraction_pipeline(chunks_jsonl_path=f"{data_dir}/chunks/{canonical_product}.jsonl", output_dir=f"{data_dir}", gemini_client=gemini_client, chroma_store=store, canonical_product=canonical_product)`.
   - Log: `"Stage 5 complete: {len(graph.nodes)} entities, {len(graph.edges)} relationships"`

6. **Stage 6 -- Parquet + Communities (conditional):**
   - If graph is empty (no nodes), log a warning and skip.
   - Call `export_parquet(graph, chunks, output_dir=f"{data_dir}/graph")`.
   - Call `community_result = detect_communities(graph, output_dir=f"{data_dir}/graph", gemini_client=gemini_client)`.
   - Log: `"Stage 6 complete: {community_result['num_communities'].get('1.0', 0)} communities detected"`

7. **Print summary:**
   - Compute totals: `source_count`, `chunk_count`, `entity_count` (from graph), `community_count` (from community_result).
   - Print a formatted summary table to stdout.
   - Return the summary dict.

**Entry point:**

```python
if __name__ == "__main__":
    args = parse_args()
    canonical = slugify_product(args.product)
    summary = run_pipeline(
        canonical_product=canonical,
        urls=args.urls,
        subreddit=args.subreddit,
        reddit_query=args.reddit_query,
        youtube_ids=args.youtube,
        data_dir=args.data_dir,
        skip_extraction=args.skip_extraction,
    )
```

**Logging setup:**

Configure Python logging at the module level with `logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")`. Each stage logs its progress at INFO level.

**Error handling:**

| Scenario | Handling |
|----------|----------|
| No sources provided (no urls, no subreddit, no youtube) | Log a warning, continue with 0 sources (pipeline still runs but produces nothing) |
| Missing GEMINI_API_KEY when extraction is needed | Log error and suggest using `--skip-extraction` flag, then raise |
| Individual stage failure | Log the error, attempt to continue with remaining stages where possible |
| KeyboardInterrupt | Catch at top level, log "Pipeline interrupted", exit gracefully |

---

### scripts/bootstrap_demo_project.py

**Purpose:** Pre-ingest a demo product corpus that can be used for demonstrations without requiring any API credentials. The script includes hardcoded seed URLs and ships pre-fetched `.md` fallback files.

**Demo product:** Use a well-known consumer product like `"iphone_18"` (a fictional but plausible product for the demo). The exact product does not matter as long as the demo corpus tells a coherent story.

**Function signature:**

```python
def bootstrap_demo(
    data_dir: str = "data",
    use_fallback: bool = False,
) -> dict:
    """Bootstrap a pre-ingested demo corpus for PanelForge.
    
    Creates a complete set of pipeline artifacts for a demo product,
    using either live fetching (if credentials are available) or
    pre-fetched .md fallback files.
    
    Args:
        data_dir: Base data directory.
        use_fallback: If True, skip live fetching and use bundled
            .md fallback files only.
    
    Returns:
        Dict with artifact counts: source_count, chunk_count,
        entity_count, community_count.
    """
```

**Fallback strategy:**

The bootstrap script should work in two modes:

1. **Live mode (default):** Attempt to fetch from real URLs. If any source fails (missing credentials, network issues), fall back to pre-fetched files for that source.

2. **Fallback mode (`use_fallback=True`):** Skip all live fetching entirely. Copy pre-fetched `.md` files from a bundled directory (`scripts/demo_fallback/`) directly into `data/md/`.

**Pre-fetched fallback files:**

Create a `scripts/demo_fallback/` directory containing 5-8 pre-written `.md` files with realistic YAML frontmatter and body text about the demo product. These files should represent different source types (web articles, Reddit posts, YouTube transcripts) and cover different facets (camera, battery, price, design, privacy, ecosystem).

Each fallback file follows the canonical Markdown format established in section-04:

```yaml
---
doc_id: demo_article_001
canonical_product: iphone_18
source_type: web_article
source_url: https://example.com/iphone-18-review
title: "iPhone 18 First Impressions: Camera Takes the Spotlight"
published_at: "2026-03-15"
author: "Demo Author"
language: en
retrieved_at: "2026-04-18T00:00:00Z"
---

Article body text about the demo product...
```

**Manifest output:**

After the pipeline completes, write `data/demo_manifest.json` containing:

```json
{
  "canonical_product": "iphone_18",
  "source_count": 6,
  "chunk_count": 25,
  "entity_count": 15,
  "community_count": 3,
  "created_at": "2026-04-18T12:00:00Z",
  "mode": "fallback"
}
```

**Credential detection:**

The bootstrap script checks for API credentials before attempting live fetching:

- `GEMINI_API_KEY` -- Required for extraction (Stage 5) and community summarization (Stage 6). If missing, use `--skip-extraction` mode in the underlying pipeline.
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` -- Required for Reddit fetching. If missing, skip Reddit sources.
- Network connectivity -- If web fetching fails for all URLs, fall back to bundled files.

**Entry point:**

```python
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Bootstrap PanelForge demo corpus")
    parser.add_argument("--data-dir", default="data", help="Base data directory")
    parser.add_argument("--fallback", action="store_true", help="Use pre-fetched fallback files only")
    args = parser.parse_args()
    
    result = bootstrap_demo(data_dir=args.data_dir, use_fallback=args.fallback)
```

**Seed URLs (hardcoded in the script):**

Include 3-5 realistic-looking seed URLs for the demo product. These URLs do not need to be real (the fallback mechanism handles failures), but they should be plausible:

```python
DEMO_SEED_URLS = [
    "https://www.techcrunch.com/2026/03/iphone-18-review",
    "https://www.theverge.com/2026/3/15/iphone-18-hands-on",
    "https://www.gsmarena.com/apple_iphone_18-review.php",
]
DEMO_SUBREDDIT = "apple"
DEMO_REDDIT_QUERY = "iPhone 18"
DEMO_YOUTUBE_IDS = [
    "dQw4w9WgXcQ",  # placeholder; would be replaced with real video IDs
]
```

---

## Configuration Summary

| Setting | Source | Default |
|---------|--------|---------|
| `GEMINI_API_KEY` | Environment variable | Required for extraction/communities, optional with `--skip-extraction` |
| `REDDIT_CLIENT_ID` | Environment variable | Required for Reddit sources, skip if missing |
| `REDDIT_CLIENT_SECRET` | Environment variable | Required for Reddit sources, skip if missing |
| `REDDIT_USER_AGENT` | Environment variable | `panelforge/0.1` |
| `--product` | CLI argument | Required for `run_ingest.py` |
| `--data-dir` | CLI argument | `"data"` |
| `--skip-extraction` | CLI flag | `False` |

---

## Error Handling Summary

| Scenario | Handling |
|----------|----------|
| No `--product` argument | argparse raises SystemExit with usage message |
| Missing GEMINI_API_KEY without `--skip-extraction` | Log error with actionable message, raise RuntimeError |
| All URL fetches fail | Log warning, continue pipeline with 0 sources (downstream stages produce empty outputs) |
| Individual stage raises exception | Log the error, attempt to continue (some stages can proceed independently) |
| Bootstrap fallback directory missing | Raise FileNotFoundError with message pointing to `scripts/demo_fallback/` |
| Bootstrap manifest write failure | Let exception propagate |
| Pipeline takes too long | No built-in timeout; the 2-minute test validates reasonable performance |

---

## Data Flow

```
run_ingest.py --product "iPhone 18" --urls URL1 URL2 --subreddit apple
    |
    v
Stage 1: fetch_urls() + fetch_reddit() + fetch_youtube()
    |   -> list of dicts [{text, metadata, source_type}, ...]
    v
Stage 2: write_markdown() for each result
    |   -> data/md/{doc_id}.md files
    v
Stage 3: chunk_documents()
    |   -> data/chunks/iphone_18.jsonl
    v
Stage 4: embed_texts() + ChunksStore.populate()
    |   -> data/vectors/chroma/ (ChromaDB collection)
    v
Stage 5: run_extraction_pipeline() [requires GEMINI_API_KEY]
    |   -> data/chunks/iphone_18_enriched.jsonl
    |   -> data/graph/graph.json
    |   -> data/cache/{chunk_id}.json (extraction cache)
    v
Stage 6: export_parquet() + detect_communities()
    |   -> data/graph/entities.parquet
    |   -> data/graph/relationships.parquet
    |   -> data/graph/text_units.parquet
    |   -> data/graph/communities.json
    |   -> data/graph/community_assignments.json
    v
Summary printed to stdout
```

---

## Implementation Checklist

1. Create `tests/test_run_ingest.py` with all 5 test stubs (RED phase)
2. Create `tests/test_bootstrap_demo.py` with all 6 test stubs (RED phase)
3. Implement `scripts/run_ingest.py`:
   - Argument parser with `--product` (required) and optional source args
   - `slugify_product()` function
   - `run_pipeline()` function orchestrating all 6 stages
   - `__main__` entry point
4. Run `tests/test_run_ingest.py` -- verify tests pass (GREEN phase)
5. Create `scripts/demo_fallback/` directory with 5-8 pre-written `.md` fallback files
6. Implement `scripts/bootstrap_demo_project.py`:
   - `bootstrap_demo()` function with credential detection and fallback logic
   - Manifest writing to `data/demo_manifest.json`
   - `__main__` entry point
7. Run `tests/test_bootstrap_demo.py` -- verify tests pass (GREEN phase)
8. Verify end-to-end: `uv run python scripts/run_ingest.py --product "Test Product" --skip-extraction` completes without error
9. Verify bootstrap: `uv run python scripts/bootstrap_demo_project.py --fallback` produces a complete manifest
10. Refactor if needed (IMPROVE phase)

---

## Verification Checklist

After implementation, confirm the following:

- [ ] `uv run python scripts/run_ingest.py --help` prints usage information
- [ ] `uv run python scripts/run_ingest.py` (no args) exits with error about missing `--product`
- [ ] `uv run python scripts/run_ingest.py --product "Test" --skip-extraction` completes with summary output
- [ ] `uv run python scripts/bootstrap_demo_project.py --fallback` creates `data/demo_manifest.json`
- [ ] `uv run pytest tests/test_run_ingest.py tests/test_bootstrap_demo.py -v` passes all tests
- [ ] The fallback `.md` files in `scripts/demo_fallback/` follow the canonical format (YAML frontmatter with all required fields)
- [ ] Summary output includes source_count, chunk_count, entity_count, community_count
- [ ] Logging output shows progress for each of the 6 stages