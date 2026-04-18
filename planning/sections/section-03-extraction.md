Now I have all the context I need. Let me generate the section content for section-03-extraction.

# Section 03: Extraction Pipeline

## Overview

This section implements the extraction pipeline -- the Gemini-powered function that takes a raw text chunk (social media post, review, survey response) and returns structured entities, relationships, and claims. This is the primary artifact consumed by Workstream 1 (WS1). WS1 calls `extract_chunk()` per ingested chunk to populate the knowledge graph.

The extraction pipeline lives at `core/extraction/extract.py` with its prompt template at `core/simulation/prompts.py` (shared prompt file) or optionally `core/extraction/prompts.py` as a dedicated extraction prompt module.

## Dependencies

- **section-01-schemas**: This section requires the `ChunkExtraction`, `ExtractedEntity`, and `ExtractedRelationship` Pydantic models from `schemas/chunk.py`, along with the `Facet`, `Stance`, `EntityType`, and `RelationshipType` literal types.
- **section-02-gemini-client**: This section requires the `generate_structured()` function from `core/gemini.py` for making typed Gemini API calls.

Both must be implemented before this section can run end-to-end.

## Files to Create

| File | Purpose |
|------|---------|
| `core/extraction/__init__.py` | Package init, exports `extract_chunk` |
| `core/extraction/extract.py` | Main extraction function |
| `core/extraction/prompts.py` | Extraction prompt template |
| `tests/core/extraction/__init__.py` | Test package init |
| `tests/core/extraction/test_extract.py` | All extraction tests |

## Tests (Write First)

All tests use pytest with pytest-asyncio. The Gemini client must be mocked -- no real API calls in tests. Tests go in `tests/core/extraction/test_extract.py`.

```python
"""Tests for the extraction pipeline.

Uses mock Gemini client throughout. No real API calls.
"""
import pytest

# --- Test: extract_chunk returns valid ChunkExtraction for sample text (mock Gemini) ---
# Mock generate_structured to return a pre-built ChunkExtraction.
# Call extract_chunk with sample text and metadata dict.
# Assert the return type is ChunkExtraction.
# Assert entities list is non-empty.
# Assert relationships list is non-empty.
# Assert facet is a valid literal value.

# --- Test: extract_chunk uses temperature=0.0 and thinking_budget=0 ---
# Mock generate_structured and capture the kwargs it receives.
# Call extract_chunk with any sample text.
# Assert temperature=0.0 was passed.
# Assert thinking_budget=0 was passed.
# This ensures extraction is fast and deterministic, not creative.

# --- Test: extract_chunk handles empty chunk text gracefully ---
# Call extract_chunk with empty string "".
# The function should either:
#   (a) raise a ValueError with a clear message, OR
#   (b) return a ChunkExtraction with empty entities/relationships.
# Pick one strategy and test it. Recommended: raise ValueError for empty input
# (fail-fast principle from coding-style rules).

# --- Test: extracted entities have unique IDs ---
# Mock generate_structured to return a ChunkExtraction with multiple entities.
# Assert that all entity IDs in the result are unique (no duplicates).
# This is important for knowledge graph integrity.

# --- Test: extracted relationships reference valid entity IDs ---
# Mock generate_structured to return a ChunkExtraction with entities and relationships.
# For each relationship, assert that both source and target IDs exist in the
# entity list of the same ChunkExtraction.

# --- Test: all Pydantic schemas pass Gemini structured output compatibility check ---
# Call ChunkExtraction.model_json_schema() and verify the output is a valid dict.
# Verify it contains the expected top-level keys (properties, required, etc.).
# This catches issues where nested Pydantic models or Literal types produce
# JSON Schema that Gemini's structured output cannot handle.
# Also verify ExtractedEntity.model_json_schema() and ExtractedRelationship.model_json_schema().
```

### Test Data

Tests need a sample chunk text and a corresponding mock `ChunkExtraction` response. Use consumer electronics topic to match the demo domain:

- Sample chunk text: A short paragraph about a phone camera review (e.g., "The new XPhone 15 camera blows away the competition with its 200MP sensor, but battery drain is severe during video recording.")
- Sample metadata dict: `{"source": "reddit", "url": "https://reddit.com/r/phones/abc", "timestamp": "2025-01-15"}`
- Mock ChunkExtraction: 2-3 entities (Product: "XPhone 15", Feature: "200MP sensor", Concern: "battery drain"), 2 relationships (MENTIONS, CONTRADICTS), facet="camera", stance="mixed"

## Implementation Details

### Extraction Prompt Template (`core/extraction/prompts.py`)

Define the prompt as a string constant `EXTRACTION_PROMPT`. The prompt has two parts:

**System message** -- establishes the extraction role:
- "You are a structured data extraction agent for consumer opinion analysis."
- "Extract entities, relationships, facets, stance, and claims from the provided text chunk."
- "Never invent facts. Only extract what is explicitly stated or clearly implied in the text."
- "Return valid JSON matching the provided schema only."

**User message template** -- contains placeholders filled at call time:
- `{source_type}`: from metadata (e.g., "reddit", "review", "survey")
- `{url}`: from metadata (optional, "N/A" if missing)
- `{timestamp}`: from metadata (optional, "N/A" if missing)
- `{chunk_text}`: the actual text to extract from

The user message should instruct:
- Identify all products, features, concerns, competitors, segments, and claims mentioned
- For each entity, provide a short description
- Identify relationships between entities with appropriate type and weight (0.0-1.0)
- Classify the overall facet of the chunk (camera, battery, price, design, privacy, ecosystem, other)
- Classify the overall stance (positive, negative, mixed, rumor, review)

Use Python string `.format()` or f-string compatible placeholders. Keep the prompt under 1000 tokens to leave room for chunk text in the context window.

### Extract Function (`core/extraction/extract.py`)

```python
async def extract_chunk(chunk_text: str, metadata: dict) -> ChunkExtraction:
    """Extract structured entities, relationships, and claims from a text chunk.

    Args:
        chunk_text: The raw text content to extract from.
        metadata: Dict with optional keys 'source', 'url', 'timestamp'.

    Returns:
        ChunkExtraction with populated entities, relationships, facet, and stance.

    Raises:
        ValueError: If chunk_text is empty or whitespace-only.
        ValueError: If Gemini call fails after retries (propagated from generate_structured).
    """
```

Implementation steps:
1. Validate `chunk_text` is non-empty and non-whitespace. Raise `ValueError` if not.
2. Build the prompt by formatting `EXTRACTION_PROMPT` with metadata fields (use `.get()` with "N/A" defaults for missing keys).
3. Call `generate_structured(prompt=formatted_prompt, response_schema=ChunkExtraction, temperature=0.0, thinking_budget=0)`.
4. Return the validated result directly. The `generate_structured` wrapper handles retries, caching, and Pydantic validation.

The function is intentionally thin -- the complexity lives in the prompt template and the `generate_structured` wrapper. This makes testing straightforward: mock `generate_structured`, verify the prompt was formatted correctly, and verify the return type.

### Temperature and Thinking Budget Rationale

- `temperature=0.0`: Extraction must be deterministic and factual. Creative variation would introduce hallucinated entities.
- `thinking_budget=0`: Extraction is a straightforward pattern-matching task. Extended thinking adds latency without improving extraction quality. This keeps per-chunk extraction fast (~1-2 seconds).

### Schema Compatibility Notes

Gemini's structured JSON output has known quirks with certain Pydantic constructs. The extraction schema uses:
- `Literal` string unions for enums (Facet, Stance, EntityType, RelationshipType) -- these work well with Gemini
- Nested lists of Pydantic models (`list[ExtractedEntity]`, `list[ExtractedRelationship]`) -- these work but must be tested
- `float` fields with implicit 0.0-1.0 range (relationship weight) -- no Gemini-side enforcement, validate post-hoc if needed

The schema compatibility test in the test suite catches any issues early. If Gemini rejects the schema, the fix is typically to simplify nested structures or replace `Optional` fields with explicit defaults.

### Delivery to WS1

This function is the primary handoff artifact to Workstream 1. Once implemented:
- WS1 imports `from core.extraction.extract import extract_chunk`
- WS1 calls it per chunk in their ingestion pipeline
- The `ChunkExtraction` schema (from section-01) defines the contract

The function should be committed and available by the equivalent of hour 4 in the hackathon timeline so WS1 can integrate it into their pipeline.

### Error Handling

- Empty input: raise `ValueError("chunk_text must be non-empty")`
- Gemini failures: let `generate_structured` handle retries and raise on persistent failure. The caller (WS1) decides whether to skip that chunk or abort.
- Malformed Gemini output: `generate_structured` runs `model_validate()` which raises `ValidationError`. This propagates up as-is -- the caller should catch and log it.

No partial results. If extraction fails for a chunk, that chunk gets no extraction. This follows the project's fail-fast strategy.