Now I have all the context I need. Let me produce the section content.

# Section 03: Reddit Fetcher and YouTube Fetcher

## Overview

This section implements two ingest modules that fetch content from Reddit and YouTube, complementing the web article fetcher (section-02). Both modules produce raw data saved to `data/raw/` and return structured results that the Markdown writer (section-04) will normalize into canonical Markdown files.

**Files to create:**
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/ingest/reddit.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/ingest/youtube.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_reddit.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_youtube.py`

**Dependencies:**
- section-01-project-setup must be complete (project scaffold, pyproject.toml with `praw>=7.8.1` and `youtube-transcript-api>=1.2.4` installed, directory structure, `__init__.py` files, shared test fixtures including `tmp_data_dir`)
- This section is parallelizable with section-02-web-fetcher (no mutual dependency)
- section-04-markdown-chunker depends on the output of this section

---

## Tests First

All tests mock external APIs. No real network calls should occur during testing. Tests use the `tmp_data_dir` fixture from section-01 for any file I/O.

### tests/test_reddit.py

```python
# Test: fetch_reddit returns posts for a valid subreddit + query
#   Mock PRAW Reddit instance. Provide a subreddit with 3 sample posts.
#   Assert return list has 3 entries with keys: title, selftext, score, url, author, created_utc, source_type.
#   Assert each post has source_type == "reddit_post".

# Test: fetch_reddit raises immediately on invalid credentials (missing env vars)
#   Ensure that when REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET env vars are missing,
#   a clear error is raised (e.g., ValueError) with a message referencing the env vars.
#   Do NOT retry or silently fail.

# Test: fetch_reddit returns empty list for nonexistent subreddit
#   Mock PRAW to raise a suitable exception (e.g., prawcore.exceptions.Redirect or NotFound).
#   Assert function returns an empty list. Assert a warning is logged.

# Test: comments are capped at 20 per post
#   Mock a post with 30 top-level comments. Assert only 20 are returned.

# Test: comments with score <= 5 are excluded
#   Mock a post with comments having scores [2, 5, 6, 10, 1].
#   Assert only comments with score > 5 are included (scores 6 and 10).

# Test: each post produces source_type "reddit_post", comments produce "reddit_comment"
#   Mock a post with 2 qualifying comments.
#   Assert the post result has source_type "reddit_post".
#   Assert each comment result has source_type "reddit_comment".

# Test: replace_more is called with limit=0 (mock PRAW to verify)
#   Mock the comment forest. Assert replace_more was called with limit=0.
```

### tests/test_youtube.py

```python
# Test: fetch_youtube returns transcript text for a valid video ID
#   Mock YouTubeTranscriptApi().fetch to return a list of snippet dicts.
#   Assert the returned text is the joined snippets.

# Test: fetch_youtube extracts video ID from full URL
#   Pass "https://www.youtube.com/watch?v=dQw4w9WgXcQ" and assert the
#   function correctly extracts "dQw4w9WgXcQ" and passes it to the API.

# Test: fetch_youtube handles TranscriptsDisabled -- skip + log
#   Mock fetch() to raise TranscriptsDisabled. Assert function returns None.
#   Assert a log message is emitted (info or warning level).

# Test: fetch_youtube handles NoTranscriptFound -- skip + log
#   Mock fetch() to raise NoTranscriptFound. Assert function returns None.
#   Assert a log message is emitted.

# Test: fetch_youtube tries language fallback list ['en', 'en-US', 'en-GB']
#   Mock fetch() and assert it is called with languages=['en', 'en-US', 'en-GB'].

# Test: transcript snippets are joined into a single string
#   Mock fetch() to return [{"text": "Hello"}, {"text": "world"}].
#   Assert the result text is "Hello world" (space-joined).
```

---

## Implementation: Reddit Fetcher (core/ingest/reddit.py)

### Purpose

Given a subreddit name and search query (typically the canonical product name), fetch posts and their top comments using PRAW (Python Reddit API Wrapper) in read-only mode.

### Environment Variables Required

- `REDDIT_CLIENT_ID` -- Reddit app client ID
- `REDDIT_CLIENT_SECRET` -- Reddit app client secret
- `REDDIT_USER_AGENT` -- User agent string (e.g., "PanelForge/1.0")

The module must validate these are present at initialization time and raise a `ValueError` immediately if any are missing. The error message must name the missing variable(s).

### Function Signature

```python
def fetch_reddit(
    subreddit_name: str,
    query: str,
    max_posts: int = 25,
    data_dir: str = "data/raw",
) -> list[dict]:
    """Fetch posts and qualifying comments from a subreddit.

    Returns a list of dicts, each with keys:
        title, selftext/body, score, url, author, created_utc, source_type

    Posts have source_type="reddit_post".
    Comments with score > 5 have source_type="reddit_comment".
    """
```

### Behavior Details

1. **Initialize PRAW in read-only mode** using the three env vars. No Reddit account login is needed.

2. **Search the subreddit** for the query string. Fetch top N posts (default 25) sorted by relevance. Use `subreddit.search(query, sort="relevance", limit=max_posts)`.

3. **For each post**, collect:
   - `title` (str)
   - `selftext` (str, the post body)
   - `score` (int)
   - `url` (str, permalink)
   - `author` (str, use `"[deleted]"` if author is None)
   - `created_utc` (float, Unix timestamp)
   - `source_type`: always `"reddit_post"`

4. **Fetch the comment tree** for each post:
   - Call `submission.comments.replace_more(limit=0)` to flatten without expensive API calls for deeply nested replies
   - Take only top-level comments (`submission.comments.list()` after `replace_more`)
   - Sort by score descending
   - Filter out comments with `score <= 5`
   - Cap at 20 comments per post

5. **For each qualifying comment**, collect:
   - `body` (str, the comment text)
   - `score` (int)
   - `author` (str, use `"[deleted]"` if None)
   - `created_utc` (float)
   - `parent_post_title` (str, the parent post's title for context)
   - `url` (str, permalink to the comment)
   - `source_type`: always `"reddit_comment"`

6. **Save raw JSON** for each post (with its comments) to `data/raw/reddit_{post_id}.json` using `json.dump`.

7. **Error handling:**
   - **Invalid credentials**: Raise `ValueError` immediately with a clear message naming the missing env vars
   - **Subreddit not found** (prawcore Redirect/NotFound): Log a warning, return an empty list
   - **Any other PRAW exception**: Log the error, skip the problematic post/comment, continue processing

8. **Return** a flat list containing all post dicts and all qualifying comment dicts.

### Key Implementation Notes

- Use `os.environ.get()` to read env vars. Check all three before constructing the Reddit instance.
- PRAW is synchronous and handles its own rate limiting internally.
- The `replace_more(limit=0)` call is critical -- without it, PRAW makes many extra API calls to resolve "load more comments" links, which is slow and unnecessary for this use case.
- Comments are separate documents from their parent posts. Each comment with `score > 5` becomes its own Markdown file downstream (section-04 handles this).

---

## Implementation: YouTube Fetcher (core/ingest/youtube.py)

### Purpose

Given video IDs or full YouTube URLs, download English captions/transcripts using the `youtube-transcript-api` library.

### Environment Variables

- `YOUTUBE_API_KEY` -- Optional. Used for fetching video metadata (title, channel name) via the YouTube Data API. Transcripts work without it, but metadata will fall back to using the video ID as the title.

### Function Signature

```python
def fetch_youtube(
    video_ids_or_urls: list[str],
    data_dir: str = "data/raw",
) -> list[dict]:
    """Fetch transcripts for YouTube videos.

    Accepts video IDs ("dQw4w9WgXcQ") or full URLs
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ").

    Returns a list of dicts, each with keys:
        video_id, title, channel, transcript_text, source_type

    Videos with disabled or unavailable transcripts are skipped.
    """
```

### Video ID Extraction

The function must accept both raw video IDs and full YouTube URLs. Implement a helper to extract the video ID:

```python
def _extract_video_id(video_id_or_url: str) -> str:
    """Extract video ID from a YouTube URL or return the ID as-is.

    Handles formats:
        - "dQw4w9WgXcQ" (raw ID)
        - "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        - "https://youtu.be/dQw4w9WgXcQ"
        - "https://www.youtube.com/embed/dQw4w9WgXcQ"
    """
```

Use `urllib.parse.urlparse` and `urllib.parse.parse_qs` for URL parsing. If the input does not look like a URL (no scheme), treat it as a raw video ID.

### Behavior Details

1. **For each video ID/URL:**
   - Extract the video ID using the helper
   - Call `YouTubeTranscriptApi().fetch(video_id, languages=['en', 'en-US', 'en-GB'])` for English language fallback
   - The `fetch` method returns a `FetchedTranscript` object. Iterate over its snippet entries to get text
   - Join all snippet `text` fields with a space to produce the full transcript string

2. **Metadata fetching** (best-effort):
   - If `YOUTUBE_API_KEY` is available, fetch video title and channel name via the YouTube Data API
   - If not available, use the video ID as the title and `"unknown"` as the channel
   - Metadata failures should not prevent transcript processing

3. **For each successful fetch**, build a result dict:
   - `video_id` (str)
   - `title` (str)
   - `channel` (str)
   - `transcript_text` (str, the joined transcript)
   - `source_type`: always `"youtube"`
   - `url` (str, `f"https://www.youtube.com/watch?v={video_id}"`)

4. **Save raw transcript JSON** to `data/raw/youtube_{video_id}.json`.

5. **Error handling:**
   - `TranscriptsDisabled`: Log an info message including the video ID, skip to next video
   - `NoTranscriptFound`: Log an info message including the video ID, skip to next video
   - `VideoUnavailable` or other exceptions: Log a warning, skip to next video
   - For cloud deployments, YouTube may block cloud IPs. If a connection error occurs, log an error with a hint about proxy configuration

6. **Return** a list of result dicts for all successfully fetched videos.

### Key Implementation Notes

- Import from `youtube_transcript_api`: `YouTubeTranscriptApi`, `TranscriptsDisabled`, `NoTranscriptFound`
- The API is version 1.2.4+. The `fetch()` method is called on an instance: `YouTubeTranscriptApi().fetch(video_id, languages=[...])`, not as a class method.
- The returned object from `fetch()` is iterable, yielding snippet objects with a `.text` attribute (or dict-like access depending on version). Handle both patterns.
- Proxy configuration for cloud deployment is out of scope for this section but should be noted in the code comments.
- No authentication is needed for transcript fetching -- only for metadata via the Data API.

---

## Error Handling Summary

| Module | Error | Handling |
|--------|-------|----------|
| reddit.py | Missing credentials env vars | Raise `ValueError` immediately with clear message |
| reddit.py | Subreddit not found | Log warning, return empty list |
| reddit.py | Other PRAW exceptions | Log error, skip item, continue |
| youtube.py | `TranscriptsDisabled` | Log info, skip video |
| youtube.py | `NoTranscriptFound` | Log info, skip video |
| youtube.py | Cloud IP blocked | Log error with proxy hint |
| youtube.py | Metadata API failure | Fall back to video ID as title |

---

## Configuration Reference

All configuration is via environment variables (no settings files):

**Required for Reddit:**
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USER_AGENT`

**Optional for YouTube:**
- `YOUTUBE_API_KEY` (transcripts work without it; only needed for video title/channel metadata)

---

## Dependencies on Other Sections

- **section-01-project-setup**: Must provide the project scaffold with `core/ingest/__init__.py`, `pyproject.toml` with `praw>=7.8.1` and `youtube-transcript-api>=1.2.4` as dependencies, the `data/raw/` directory, and the shared `tmp_data_dir` pytest fixture.
- **section-04-markdown-chunker**: Consumes the output of this section. The dicts returned by `fetch_reddit` and `fetch_youtube` are passed to `md_writer.py` which normalizes them into canonical Markdown with YAML frontmatter. Reddit posts get `source_type: reddit_post`, comments get `source_type: reddit_comment`, and YouTube transcripts get `source_type: youtube`.