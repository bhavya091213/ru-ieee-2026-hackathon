The project has no code yet -- just planning documents. Now I have all the context I need. Let me generate the section content.

# Section 04: Markdown Writer + Chunker

## Overview

This section implements two components that bridge raw fetched content and the indexing pipeline:

1. **`core/ingest/md_writer.py`** -- Converts raw fetcher output (from web, Reddit, YouTube fetchers) into canonical Markdown files with YAML frontmatter, saved to `data/md/`.
2. **`core/indexing/chunk.py`** -- Reads canonical Markdown files and splits them into evidence-unit chunks suitable for embedding and extraction, saved as JSONL to `data/chunks/`.

Together, these form Stage 2 (normalization) and the first half of Stage 3 (chunking) in the data pipeline.

## Dependencies

- **section-01-project-setup**: Project structure, `pyproject.toml`, `__init__.py` files, shared test fixtures (`tmp_data_dir`, `sample_chunks`), and all package dependencies must be in place.
- **section-02-web-fetcher**: `core/ingest/fetch.py` must exist and produce output that `md_writer.py` can consume (text + metadata dicts).
- **section-03-reddit-youtube**: `core/ingest/reddit.py` and `core/ingest/youtube.py` must exist and produce output that `md_writer.py` can consume.

**Blocks:** section-05-embedding-chroma and section-06-extraction-graph both consume the JSONL chunk output from this section.

## Required Packages

These should already be installed via section-01-project-setup:

- `markdownify>=1.2.2` -- for converting HTML content to clean Markdown
- `pyyaml` -- for YAML frontmatter serialization/deserialization (comes with most Python installs, but should be explicit)
- `pytest` -- test framework

No additional dependencies beyond what the project already declares.

---

## Tests First

All tests follow the RED-GREEN-REFACTOR TDD cycle. Write these tests before any implementation code.

### tests/test_md_writer.py

```python
# Test: write_markdown produces valid YAML frontmatter with all required fields
#   - Call write_markdown with sample fetcher output (text, title, author, date, URL)
#   - Read the produced .md file
#   - Parse the YAML frontmatter block (between --- delimiters)
#   - Assert all required keys exist: doc_id, canonical_product, source_type,
#     source_url, title, published_at, author, language, retrieved_at

# Test: write_markdown generates deterministic doc_id from source type + content hash
#   - Call write_markdown twice with identical inputs
#   - Assert the returned doc_id values are the same
#   - Call with different content, assert doc_ids differ

# Test: write_markdown sets published_at to "unknown" when not available
#   - Call write_markdown with published_at=None
#   - Parse frontmatter, assert published_at == "unknown"

# Test: write_markdown sets author to "anonymous" when not available
#   - Call write_markdown with author=None
#   - Parse frontmatter, assert author == "anonymous"

# Test: write_markdown converts HTML to clean Markdown via markdownify
#   - Call write_markdown with text containing HTML tags (e.g., "<h2>Title</h2><p>Body</p>")
#   - Read the file body (after frontmatter)
#   - Assert HTML tags are gone and Markdown equivalents are present

# Test: write_markdown saves file to data/md/{doc_id}.md
#   - Call write_markdown with a tmp_data_dir
#   - Assert the file exists at the expected path: {output_dir}/md/{doc_id}.md

# Test: write_markdown sets retrieved_at to current ISO datetime
#   - Call write_markdown
#   - Parse frontmatter, assert retrieved_at is a valid ISO datetime string
#   - Assert it is close to the current time (within a few seconds)
```

### tests/test_chunk.py

```python
# Test: chunk_documents splits text into ~500 token chunks with 50-token overlap
#   - Create a markdown file with a long body (~2000 tokens)
#   - Call chunk_documents
#   - Assert each chunk's text is approximately 500 tokens (allow tolerance, e.g., 400-600)
#   - Assert overlap exists between consecutive chunks from the same doc

# Test: chunk IDs are content-hashed SHA256(doc_id:char_start:char_end) truncated to 16 hex
#   - Create a known markdown file, call chunk_documents
#   - Manually compute SHA256 of "doc_id:char_start:char_end" for the first chunk
#   - Assert chunk_id matches the first 16 hex characters

# Test: chunk IDs are deterministic -- same input always produces same IDs
#   - Call chunk_documents twice on the same file
#   - Assert all chunk_ids are identical between runs

# Test: chunk boundaries respect paragraph breaks (\n\n)
#   - Create a markdown file with several short paragraphs separated by \n\n
#   - Call chunk_documents
#   - Assert no chunk splits a paragraph in the middle (chunks start/end at paragraph boundaries when possible)

# Test: chunk boundaries respect section headers (#)
#   - Create a markdown file with multiple ## headers
#   - Call chunk_documents
#   - Assert chunks start at header boundaries where possible

# Test: section_title is detected from nearest preceding Markdown header
#   - Create a markdown file with "## Camera" followed by body text, then "## Battery"
#   - Call chunk_documents
#   - Assert chunks under "Camera" have section_title == "Camera"
#   - Assert chunks under "Battery" have section_title == "Battery"

# Test: frontmatter metadata is propagated to each chunk's metadata dict
#   - Create a markdown file with frontmatter including canonical_product, source_type, published_at
#   - Call chunk_documents
#   - Assert every chunk record contains these values in its metadata dict

# Test: empty documents (no body after frontmatter) are skipped with warning
#   - Create a markdown file with only frontmatter and no body
#   - Call chunk_documents
#   - Assert no chunks are produced for that file
#   - Assert a warning was logged (use caplog or similar)

# Test: output JSONL records match the documented schema
#   - Call chunk_documents on a valid file
#   - Assert each record has keys: chunk_id, doc_id, text, section_title, char_start, char_end, metadata
#   - Assert metadata contains: canonical_product, source_type, published_at

# Test: facet and stance are NOT present in raw chunk output (added in enrichment)
#   - Call chunk_documents
#   - Assert no chunk record contains "facet" or "stance" keys at the top level or in metadata
```

---

## Implementation Details

### File: `core/ingest/md_writer.py`

**Purpose:** Convert raw fetcher output into canonical Markdown files with YAML frontmatter. This normalizes all source types (web articles, Reddit posts/comments, YouTube transcripts) into a single format for downstream processing.

**Public function signature:**

```python
def write_markdown(
    text: str,
    metadata: dict,
    canonical_product: str,
    output_dir: str,
    source_type: str,
) -> str:
    """Write a canonical Markdown file with YAML frontmatter.

    Args:
        text: The raw content text (may contain HTML).
        metadata: Dict with keys like title, author, published_at, source_url.
        canonical_product: Slugified product name (e.g., "iphone_18").
        output_dir: Base data directory (e.g., "data/").
        source_type: One of "web_article", "reddit_post", "reddit_comment", "youtube".

    Returns:
        The generated doc_id string.
    """
```

**Key behaviors:**

1. **doc_id generation**: Create a deterministic ID from the source_type and a hash of the content. Use a scheme like `doc_{source_type_prefix}_{hash_hex[:8]}` where the hash is derived from the text content. The ID must be filesystem-safe (no special characters).

2. **YAML frontmatter**: Write a YAML block delimited by `---` containing exactly these fields:
   - `doc_id`: the generated ID
   - `canonical_product`: passed in
   - `source_type`: one of `web_article`, `reddit_post`, `reddit_comment`, `youtube`
   - `source_url`: from metadata, or `"unknown"` if missing
   - `title`: from metadata, or `"Untitled"` if missing
   - `published_at`: from metadata, or `"unknown"` if missing
   - `author`: from metadata, or `"anonymous"` if missing
   - `language`: default `"en"`
   - `retrieved_at`: current UTC time in ISO 8601 format

3. **HTML conversion**: If the text contains HTML tags, convert to Markdown using `markdownify.markdownify()`. If the text is already plain text or Markdown, pass it through unchanged. A simple heuristic: check if the text contains common HTML tags like `<p>`, `<div>`, `<h1>`-`<h6>`.

4. **File output**: Write the combined frontmatter + body to `{output_dir}/md/{doc_id}.md`. Create the `md/` directory if it does not exist.

5. **Immutability**: The function creates a new file and returns the doc_id. It does not modify any input arguments.

---

### File: `core/indexing/chunk.py`

**Purpose:** Read canonical Markdown files from `data/md/` and split them into evidence-unit chunks written as JSONL. Each chunk is a passage of approximately 500 tokens with 50-token overlap, suitable for embedding and entity extraction.

**Public function signature:**

```python
def chunk_documents(
    md_dir: str,
    output_path: str,
    canonical_product: str,
    target_tokens: int = 500,
    overlap_tokens: int = 50,
) -> list[dict]:
    """Split all Markdown files in md_dir into chunks and write JSONL.

    Args:
        md_dir: Path to directory containing .md files with YAML frontmatter.
        output_path: Path to write output JSONL file.
        canonical_product: Product slug for filtering (only chunk files matching this product).
        target_tokens: Target chunk size in tokens (approximate).
        overlap_tokens: Number of overlapping tokens between consecutive chunks.

    Returns:
        List of chunk record dicts (also written to output_path as JSONL).
    """
```

**Key behaviors:**

1. **Frontmatter parsing**: Read each `.md` file, split on `---` delimiters to separate YAML frontmatter from body. Parse frontmatter using a YAML parser to extract metadata fields (doc_id, canonical_product, source_type, published_at, etc.).

2. **Empty document handling**: If a file has no body text after the frontmatter (only whitespace), log a warning and skip it. Do not produce any chunks for empty documents.

3. **Section-aware splitting strategy** (in priority order):
   - First, split at Markdown headers (`#`, `##`, `###`, etc.) to get section-level blocks.
   - Within each section, split at paragraph boundaries (`\n\n`).
   - If a single paragraph exceeds the target token count, fall back to splitting at sentence boundaries or at the token limit.
   - Each chunk should be approximately `target_tokens` tokens. Use a simple token approximation (e.g., split on whitespace and count words, or use a lightweight tokenizer). The approximation does not need to match the embedding model's tokenizer exactly -- it is a sizing heuristic.

4. **Overlap**: When splitting sequentially within a document, the last `overlap_tokens` tokens of chunk N should be repeated at the start of chunk N+1. This ensures no information is lost at chunk boundaries. Overlap does NOT apply across section boundaries (a new `#` header starts a fresh chunk with no overlap from the previous section).

5. **section_title detection**: Track the most recently seen Markdown header. Every chunk within that section carries the header text (without the `#` prefix) as its `section_title`. If no header has been seen yet (text before first header), use `None` or an empty string.

6. **Chunk ID generation**: For each chunk, compute `SHA256(doc_id + ":" + str(char_start) + ":" + str(char_end))` and take the first 16 hexadecimal characters. `char_start` and `char_end` are character offsets into the original document body (after frontmatter).

7. **Output schema**: Each chunk record is a dict with these keys:
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
   Note: `facet` and `stance` are intentionally absent from chunk output. These are added later by the extraction stage (section-06) into a separate enriched JSONL file. The raw chunk file is never mutated.

8. **JSONL output**: Write all chunk records to `output_path` as newline-delimited JSON. One JSON object per line. Create parent directories if they do not exist.

9. **Token counting**: For the approximate token count, a simple approach is to split on whitespace (word count) and treat 1 word as approximately 1 token. This is sufficient for sizing chunks. A more precise approach would use `tiktoken` or the model's tokenizer, but that adds a dependency for minimal benefit at this stage.

---

## File Paths Summary

Files to create:

| File | Purpose |
|------|---------|
| `core/ingest/md_writer.py` | Markdown writer with YAML frontmatter |
| `core/indexing/chunk.py` | Markdown-to-chunk JSONL splitter |
| `tests/test_md_writer.py` | Tests for md_writer |
| `tests/test_chunk.py` | Tests for chunker |

All paths are relative to the project root: `/Users/bhavyapatel/Documents/Projects/focus-group-agent/`

Files that must exist before starting (from prior sections):

| File | From Section |
|------|-------------|
| `core/__init__.py` | section-01 |
| `core/ingest/__init__.py` | section-01 |
| `core/indexing/__init__.py` | section-01 |
| `pyproject.toml` | section-01 |
| `core/ingest/fetch.py` | section-02 |
| `core/ingest/reddit.py` | section-03 |
| `core/ingest/youtube.py` | section-03 |

---

## Data Flow

```
Fetcher output (text + metadata dict)
    |
    v
md_writer.py  -->  data/md/{doc_id}.md  (canonical Markdown with YAML frontmatter)
    |
    v
chunk.py      -->  data/chunks/{canonical_product}.jsonl  (chunk records)
```

The JSONL chunk file is consumed by:
- **section-05** (embed.py + chroma_store.py) for embedding and vector storage
- **section-06** (graph_builder.py) for entity extraction, which also writes a separate `{product}_enriched.jsonl` with facet/stance fields added

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| md_writer receives `None` for text | Raise `ValueError` with a clear message -- callers should filter before calling |
| md_writer output directory does not exist | Create it with `os.makedirs(exist_ok=True)` |
| chunk.py encounters a file with no body after frontmatter | Log a warning (use `logging.warning`), skip the file, continue with next |
| chunk.py encounters a file with malformed frontmatter | Log a warning with the filename, skip the file |
| chunk.py target directory does not exist | Create it with `os.makedirs(exist_ok=True)` |
| JSONL write fails mid-file (disk full, permissions) | Let the exception propagate -- callers handle retries |

---

## Implementation Notes

- **Immutability**: `write_markdown` creates new files; `chunk_documents` creates a new JSONL file. Neither modifies input data or existing files.
- **Idempotency**: Because doc_ids and chunk_ids are deterministic (content-hashed), re-running the pipeline on the same input produces identical output files. This is by design for crash safety and reruns.
- **The enriched JSONL pattern**: The raw `{product}.jsonl` is never modified after creation. The extraction stage (section-06) reads it, adds facet/stance/claims fields, and writes a separate `{product}_enriched.jsonl`. This immutability ensures that if extraction crashes partway, the original chunks are intact.
- **Token approximation**: Word count is sufficient for chunk sizing. The embedding model (MiniLM) has a 256 word-piece limit, and chunks of ~500 words will be truncated at embedding time. This is acceptable because the embedding captures the first 256 tokens, and the full text is stored separately for retrieval display. If more precise token counting is desired, consider using `len(text.split())` as the baseline and adjusting the target accordingly.