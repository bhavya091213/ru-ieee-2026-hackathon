Good -- section-01-schemas hasn't been written yet, which is expected since this is a parallel plan generation. I now have all the context I need to generate section-02-gemini-client. Let me produce the content.

# Section 02: Gemini Client and Configuration

## Overview

This section implements the centralized configuration layer (`config.py`), the Gemini client factory, and the `generate_structured()` wrapper that every downstream section relies on. It also establishes the structured logging setup that all other modules use. This is the single gateway for all LLM interactions in the system.

**Files to create:**
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/config.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/__init__.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/core/gemini.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/__init__.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_config.py`
- `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_gemini.py`

**Depends on:** section-01-schemas (Pydantic v2 BaseModel subclasses used as `response_schema` arguments). You need at least one concrete schema importable from the schemas package to test `generate_structured()`. If section-01 is not yet implemented, create a minimal test-only Pydantic model inline in the test file.

**Blocks:** section-03 (extraction), section-04 (clustering -- indirectly via persona synthesis), section-05 (persona synthesis), section-08 (simulation rounds), section-09 (moderator/analyst). Every module that makes a Gemini call imports `generate_structured` from `core/gemini.py`.

---

## Tests First

All tests use **pytest** with **pytest-asyncio**. The `google-genai` client is always mocked in unit tests -- no real API calls.

### `tests/test_config.py`

```python
"""Tests for config.py — Pydantic BaseSettings configuration."""

# Test: config loads GEMINI_API_KEY from environment
#   Set env var GEMINI_API_KEY="test-key-123", instantiate Settings, assert value matches.

# Test: config defaults GEMINI_MODEL to "gemini-2.5-flash"
#   Instantiate Settings without setting GEMINI_MODEL env var, assert default.

# Test: config defaults USE_MOCK_RETRIEVAL to True
#   Instantiate Settings without setting USE_MOCK_RETRIEVAL, assert True.

# Test: config defaults TRIBE_ENABLED to False
#   Instantiate Settings without setting TRIBE_ENABLED, assert False.
```

### `tests/test_gemini.py`

```python
"""Tests for core/gemini.py — generate_structured() wrapper."""

# Test: generate_structured returns typed result matching schema (mock genai client)
#   Mock the genai client to return valid JSON for a simple Pydantic model.
#   Assert the return type matches the generic type parameter.

# Test: generate_structured retries on ResourceExhausted (mock 2 failures then success)
#   Mock client to raise google.api_core.exceptions.ResourceExhausted twice,
#   then return valid JSON. Assert result is returned, assert client called 3 times.

# Test: generate_structured raises after 2 retries exhausted
#   Mock client to raise ResourceExhausted 3 times. Assert ValueError is raised.
#   Assert client called exactly 3 times (1 initial + 2 retries).

# Test: generate_structured validates response with model_validate (reject malformed)
#   Mock client to return JSON that does NOT match the schema (e.g., missing required field).
#   Assert ValueError is raised with a message about validation failure.

# Test: generate_structured detects finish_reason=MAX_TOKENS and raises
#   Mock client response with finish_reason set to MAX_TOKENS.
#   Assert ValueError raised with message indicating truncation.

# Test: generate_structured detects finish_reason=SAFETY and raises
#   Mock client response with finish_reason set to SAFETY.
#   Assert ValueError raised with message indicating safety block.

# Test: generate_structured cache hit returns cached result without API call
#   Call generate_structured twice with identical prompt, schema, and temperature.
#   Assert the genai client is called only once (second call hits cache).
#   Assert both return values are equal.

# Test: generate_structured cache miss calls API and caches result
#   Call generate_structured with prompt A, then prompt B.
#   Assert genai client is called twice (different cache keys).

# Test: generate_structured preserves generic type (TypeVar return)
#   Call with a specific Pydantic model type. Assert isinstance check passes on return value.
```

---

## Implementation Details

### `config.py` -- Centralized Settings

Use Pydantic v2 `BaseSettings` with `SettingsConfigDict` for environment variable loading. All settings are loaded from environment variables (optionally from a `.env` file using `env_file=".env"`).

**Fields:**

| Field | Type | Default | Env Var |
|-------|------|---------|---------|
| `GEMINI_API_KEY` | `str` | (required) | `GEMINI_API_KEY` |
| `GEMINI_MODEL` | `str` | `"gemini-2.5-flash"` | `GEMINI_MODEL` |
| `CORS_ORIGINS` | `list[str]` | `["http://localhost:5173", "*"]` | `CORS_ORIGINS` |
| `TRIBE_ENABLED` | `bool` | `False` | `TRIBE_ENABLED` |
| `USE_MOCK_RETRIEVAL` | `bool` | `True` | `USE_MOCK_RETRIEVAL` |
| `LOG_LEVEL` | `str` | `"INFO"` | `LOG_LEVEL` |

Provide a module-level singleton accessor:

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "*"]
    TRIBE_ENABLED: bool = False
    USE_MOCK_RETRIEVAL: bool = True
    LOG_LEVEL: str = "INFO"

@lru_cache
def get_settings() -> Settings:
    """Cached singleton for application settings."""
    return Settings()
```

### Gemini Client Factory

Also in `config.py`, provide a lazy singleton for the `google-genai` client:

```python
from google import genai

_client: genai.Client | None = None

def get_gemini_client() -> genai.Client:
    """Lazy singleton for Gemini client. Reads API key from settings."""
```

This function reads `GEMINI_API_KEY` from the settings singleton and creates the client on first call, storing it in the module-level `_client` variable. Subsequent calls return the cached client. The client is initialized with `genai.Client(api_key=settings.GEMINI_API_KEY)`.

### `core/gemini.py` -- The `generate_structured()` Wrapper

This is the most important function in the entire codebase. Every Gemini call in the system goes through it.

**Signature:**

```python
from typing import TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

async def generate_structured(
    prompt: str,
    response_schema: type[T],
    temperature: float = 0.0,
    thinking_budget: int | None = None,
) -> T:
    """Call Gemini with structured JSON output and Pydantic validation."""
```

**Behavior, step by step:**

1. **Cache check**: Compute a cache key as `sha256(prompt + schema.__name__ + str(temperature))`. If the key exists in the module-level `_cache: dict[str, BaseModel]` dictionary, return the cached value (cast to `T`).

2. **Build request config**: Create a `genai.types.GenerateContentConfig` with:
   - `response_mime_type="application/json"`
   - `response_schema` set to the Pydantic model class
   - `temperature` as passed
   - If `thinking_budget` is not None, set `thinking_config=genai.types.ThinkingConfig(thinking_budget=thinking_budget)`

3. **Call with retry**: Attempt the API call up to 3 times total (1 initial + 2 retries). Retry only on transient errors: `google.api_core.exceptions.ResourceExhausted`, `google.api_core.exceptions.ServiceUnavailable`, `google.api_core.exceptions.DeadlineExceeded`. Use exponential backoff: sleep 1 second after first failure, 2 seconds after second failure. Use `asyncio.sleep()` for non-blocking waits.

4. **Check finish_reason**: After a successful API response, inspect the candidate's `finish_reason`. If it is `MAX_TOKENS`, raise `ValueError("Gemini response truncated (MAX_TOKENS)")`. If it is `SAFETY`, raise `ValueError("Gemini response blocked by safety filter")`.

5. **Parse and validate**: Extract the text content from the response. Call `response_schema.model_validate_json(text)` to parse and validate. If validation fails (Pydantic `ValidationError`), raise `ValueError` with the validation error details.

6. **Cache and return**: Store the validated result in `_cache[cache_key]` and return it.

7. **Logging**: Log every call with: prompt length (chars), schema name, temperature, latency (ms), retry count, cache hit/miss. Use Python's `logging` module. The log format should be structured (key=value pairs) for easy parsing.

**Module-level state:**

```python
import hashlib
import logging
from typing import TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)
_cache: dict[str, BaseModel] = {}
```

Provide a `clear_cache()` function for testing:

```python
def clear_cache() -> None:
    """Clear the prompt-hash cache. Used in tests."""
    _cache.clear()
```

### Structured Logging Setup

Configure structured logging in `config.py` or in a separate `logging_config.py` if preferred. The key requirement is that every Gemini call logs:

- `event="gemini_call"` 
- `prompt_length=<int>` (character count)
- `schema=<str>` (model class name)
- `temperature=<float>`
- `latency_ms=<int>`
- `retry_count=<int>`
- `cache_hit=<bool>`

Use `logging.basicConfig` with `LOG_LEVEL` from settings. The format string should use standard Python logging -- no external logging libraries needed for the hackathon.

---

## Dependencies and Package Requirements

This section requires the following Python packages (to be declared in `pyproject.toml`):

- `google-genai` -- the official Google GenAI SDK (not `google-generativeai`, which is the older package)
- `google-api-core` -- for exception types used in retry logic
- `pydantic>=2.0` -- BaseModel for schema validation
- `pydantic-settings` -- for BaseSettings environment loading
- `python-dotenv` -- for `.env` file support (used by pydantic-settings)

For testing:
- `pytest`
- `pytest-asyncio`
- `unittest.mock` (stdlib)

---

## Key Design Decisions

1. **Prompt-hash cache is in-memory only**: No persistence. This is a hackathon project. The cache prevents duplicate Gemini calls during development and demo reruns. The cache key includes temperature because different temperatures produce different outputs.

2. **Fail fast on persistent failure**: After 2 retries (3 total attempts), the function raises `ValueError`. The orchestrator catches this and transitions to `FAILED` state. No partial results are returned anywhere in the system.

3. **No async client needed**: The `google-genai` SDK's `generate_content` method is synchronous. Wrap it in `asyncio.to_thread()` if it blocks the event loop, or use the async variant if available in the SDK version. Check the SDK docs -- if `client.aio.models.generate_content` exists, use that directly.

4. **Generic TypeVar ensures type safety**: Callers get proper type hints. When you call `generate_structured(prompt, PersonaResponse)`, the return type is inferred as `PersonaResponse`, not `BaseModel`.

5. **Module-level cache dict, not class**: Keeping `generate_structured` as a standalone async function (not a class method) keeps the API simple. The cache and client are module-level singletons. This is acceptable for a single-process hackathon app.

---

## Verification Checklist

After implementing, verify:

- [ ] `Settings()` raises if `GEMINI_API_KEY` is not set
- [ ] `get_settings()` returns the same object on repeated calls (lru_cache)
- [ ] `get_gemini_client()` creates client with the correct API key
- [ ] `generate_structured()` returns a properly typed Pydantic model
- [ ] Cache prevents duplicate API calls for identical inputs
- [ ] Retry logic handles transient errors with exponential backoff
- [ ] `MAX_TOKENS` and `SAFETY` finish reasons raise clear errors
- [ ] Invalid JSON from Gemini results in a `ValueError` with Pydantic details
- [ ] All tests pass with `uv run pytest tests/test_config.py tests/test_gemini.py`