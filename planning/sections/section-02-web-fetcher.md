Now I have all the context needed. Let me generate the section content.

# Section 02: Web Article Fetcher

## Overview

This section implements `core/ingest/fetch.py`, the web article fetcher that downloads and extracts content from URLs using Trafilatura. It is the first data source in the multi-source fetching pipeline (Stage 1). The fetcher handles retries with exponential backoff, gracefully skips unreachable or non-article pages, and saves raw HTML to disk.

**File to create:** `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/ingest/fetch.py`
**Test file to create:** `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_fetch.py`

## Dependencies

- **Depends on:** section-01-project-setup (project structure, `pyproject.toml` with `trafilatura>=2.0.0`, `__init__.py` files for `core/` and `core/ingest/`, `data/raw/` directory)
- **Blocks:** section-04-markdown-chunker (which consumes the output of this fetcher)
- **Parallelizable with:** section-03-reddit-youtube

## Key Library: Trafilatura

Trafilatura is a web scraping library optimized for extracting article text from HTML. Two functions are used:

- `trafilatura.fetch_url(url)` — downloads the raw HTML from a URL. Returns `None` on failure.
- `trafilatura.extract(html, output_format="json", with_metadata=True)` — extracts article content from HTML. Returns a JSON string with fields like `title`, `author`, `date`, `text`, `url`. Returns `None` if the page is not an extractable article (login wall, non-article page, etc.).

## Tests First (tests/test_fetch.py)

All tests should mock Trafilatura's `fetch_url` and `extract` functions to avoid real network calls. Use `tmp_path` (pytest built-in) for file system assertions.

```python
"""Tests for core/ingest/fetch.py — Web article fetcher with retry/backoff."""

# Test: fetch_urls returns extracted content for a valid URL
# - Mock trafilatura.fetch_url to return sample HTML
# - Mock trafilatura.extract to return a JSON string with title, author, date, text
# - Call fetch_urls(["https://example.com/review"], "iphone_18", data_dir=tmp_path)
# - Assert return list has one result with expected title and text fields
# - Assert raw HTML saved to data/raw/{doc_id}.html

# Test: fetch_urls retries on timeout, succeeds on 2nd attempt
# - Mock fetch_url to raise/return None on first call, return HTML on second
# - Assert result list has one successful entry
# - Assert fetch_url was called exactly 2 times

# Test: fetch_urls skips after 3 failed retries and logs warning
# - Mock fetch_url to always return None (simulating persistent failure)
# - Assert result list is empty
# - Assert fetch_url was called exactly 4 times (1 initial + 3 retries)
# - Assert warning was logged (use caplog fixture)

# Test: fetch_urls handles 404 gracefully (skip + log, no exception)
# - Mock fetch_url to return None (Trafilatura returns None for HTTP errors)
# - Assert no exception raised
# - Assert result list is empty

# Test: fetch_urls handles non-HTML content (PDF URL) — skip + log
# - Mock fetch_url to return non-HTML content (e.g., binary-like string)
# - Mock extract to return None
# - Assert result list is empty
# - Assert appropriate log message

# Test: fetch_urls handles None return from trafilatura.extract (paywall page)
# - Mock fetch_url to return valid HTML
# - Mock extract to return None
# - Assert result list is empty (extraction failure is a skip, not an error)

# Test: doc_id generation is deterministic for same URL
# - Call the doc_id generation function twice with the same URL
# - Assert both produce identical doc_id values
# - Format: "doc_{slugified_domain}_{path_hash_6hex}"

# Test: raw HTML is saved to data/raw/{doc_id}.html
# - Mock fetch_url to return HTML, extract to return valid JSON
# - Call fetch_urls with data_dir=tmp_path
# - Assert file exists at tmp_path / "raw" / "{doc_id}.html"
# - Assert file content matches the mock HTML
```

## Implementation Details (core/ingest/fetch.py)

### Module Responsibilities

1. **Accept a list of URLs and a canonical product name** and return extraction results for all successfully fetched pages.
2. **Retry with exponential backoff** on fetch failures (1s, 2s, 4s delays; 3 retries max).
3. **Skip and log** URLs that fail all retries or return non-extractable content.
4. **Save raw HTML** to `data/raw/{doc_id}.html` for auditability.
5. **Generate deterministic doc_id** values from the URL for downstream deduplication.

### Function Signatures

```python
def generate_doc_id(url: str) -> str:
    """Generate a deterministic document ID from a URL.

    Format: doc_{slugified_domain}_{path_hash_6hex}
    Example: doc_appleinsider_a3f8c1

    Uses the domain (slugified, lowercased) and a truncated SHA256
    hash of the full URL path for uniqueness.
    """

def fetch_urls(
    urls: list[str],
    canonical_product: str,
    data_dir: str | Path = "data",
) -> list[dict]:
    """Fetch and extract article content from a list of URLs.

    For each URL:
    1. Attempt trafilatura.fetch_url() with retry/backoff
    2. On success, extract content via trafilatura.extract(output_format="json", with_metadata=True)
    3. Save raw HTML to data_dir/raw/{doc_id}.html
    4. Return extraction result dict (title, author, date, text, url, doc_id)

    Args:
        urls: List of web article URLs to fetch.
        canonical_product: Product slug (e.g., "iphone_18") for metadata.
        data_dir: Base data directory (default "data").

    Returns:
        List of dicts, one per successfully fetched URL. Each dict contains:
        - doc_id: str
        - title: str
        - author: str (may be None)
        - date: str (may be None)
        - text: str
        - url: str
        - canonical_product: str
    """
```

### Retry Logic

The retry implementation should follow this pattern:

- Maximum 3 retries (4 total attempts including the initial try)
- Exponential backoff delays: 1 second, 2 seconds, 4 seconds
- Use `time.sleep()` for delays (this is a batch pipeline, not async)
- On each failure, log the attempt number and URL at `DEBUG` level
- After all retries exhausted, log a `WARNING` with the URL and move to the next URL

### doc_id Generation

The `doc_id` format is `doc_{slugified_domain}_{path_hash}`:

1. Parse the URL to extract the domain (e.g., `www.appleinsider.com` becomes `appleinsider`)
2. Slugify the domain: lowercase, remove `www.`, replace non-alphanumeric with underscore
3. Hash the full URL path using SHA256, truncate to first 6 hex characters
4. Combine: `f"doc_{slug}_{hash_hex[:6]}"`

This ensures the same URL always produces the same doc_id, enabling idempotent reruns.

### Raw HTML Saving

Before extraction, save the fetched HTML to `data/raw/{doc_id}.html`. Create the `data/raw/` directory if it does not exist (use `Path.mkdir(parents=True, exist_ok=True)`). This preserves the original content for debugging and re-processing.

### Error Handling

| Scenario | Behavior |
|----------|----------|
| `fetch_url()` returns `None` | Retry up to 3 times, then skip with WARNING log |
| `fetch_url()` raises exception | Catch, retry up to 3 times, then skip with WARNING log |
| `extract()` returns `None` | Skip URL (non-article page, paywall), log at INFO level |
| Non-HTML content (PDF, image) | `extract()` returns `None`, handled by the above case |
| Network timeout | `fetch_url()` returns `None`, handled by retry logic |

### Logging

Use Python's standard `logging` module. Get the logger with `logger = logging.getLogger(__name__)`. Log levels:

- `DEBUG`: Each fetch attempt, retry attempt number
- `INFO`: Successful extraction, skipped URLs (extraction returned None)
- `WARNING`: URL skipped after all retries exhausted, unexpected errors

### Return Value

Each successful extraction result is a dict with:

```python
{
    "doc_id": "doc_appleinsider_a3f8c1",
    "title": "iPhone 18 Review: Camera Improvements",
    "author": "John Doe",
    "date": "2026-04-15",
    "text": "The iPhone 18 features a major camera upgrade...",
    "url": "https://www.appleinsider.com/articles/iphone-18-review",
    "canonical_product": "iphone_18"
}
```

The `title`, `author`, and `date` fields come from Trafilatura's JSON output. The `text` field is the extracted article body. Fields may be `None` if Trafilatura could not determine them -- the downstream Markdown writer (section-04) handles missing values by substituting defaults like `"unknown"` and `"anonymous"`.

### Trafilatura extract() JSON Output

When called with `output_format="json"` and `with_metadata=True`, `trafilatura.extract()` returns a JSON string. Parse it with `json.loads()` to get a dict. Relevant keys: `"title"`, `"author"`, `"date"`, `"text"`, `"url"`, `"hostname"`, `"source"`.

## Implementation Checklist

1. Create `tests/test_fetch.py` with all 8 test stubs (RED phase)
2. Create `core/ingest/fetch.py` with `generate_doc_id()` and `fetch_urls()`
3. Implement doc_id generation -- run doc_id tests (GREEN)
4. Implement retry logic with exponential backoff -- run retry tests (GREEN)
5. Implement HTML saving to `data/raw/` -- run save tests (GREEN)
6. Implement the full fetch-extract loop -- run all tests (GREEN)
7. Verify all 8 tests pass
8. Refactor if needed (IMPROVE phase)