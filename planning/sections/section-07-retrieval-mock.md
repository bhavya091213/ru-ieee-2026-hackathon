Now I have all the context I need. Let me review the relevant section description again from the index.md and the matching content from both plan files. The section is `section-07-retrieval-mock`, which covers:

- Mock `retrieve()` and `get_community_labels()` for demo
- ~50 hardcoded demo chunks about consumer electronics
- Facet filtering
- `USE_MOCK_RETRIEVAL` env var control
- `retrieve_for_persona()` wrapper

The relevant plan content is from sections 7 (Simulation Orchestrator, specifically the retrieve.py part) and 10 (WS1 Mock Layer). The relevant TDD content comes from sections 7 (Retrieval subsection) and 10 (WS1 Mock Layer).

Here is the section content:

# Section 07: Retrieval Mock Layer

## Overview

This section implements the retrieval abstraction and its mock backend for demo purposes. It consists of two concerns: (1) a `retrieve_for_persona()` function that constructs queries from persona data and a scenario, and (2) a mock data layer with ~50 hardcoded consumer electronics opinion chunks that serve as a stand-in for WS1's real retrieval pipeline. The mock is controlled by the `USE_MOCK_RETRIEVAL` environment variable.

This section is parallelizable with sections 03, 04, and 12 (Batch 3 in the execution order). It blocks section 08 (Simulation Rounds), which consumes `retrieve_for_persona()`.

## Dependencies

- **section-01-schemas**: This section requires the `Persona`, `Scenario`, and `Belief` schemas from `schemas/persona.py` and `schemas/scenario.py`. It also requires the facet literal type (camera, battery, price, design, privacy, ecosystem, other) from `schemas/chunk.py`.
- **section-02-gemini-client**: Only for the `config.py` file where `USE_MOCK_RETRIEVAL` is defined as a `BaseSettings` field (default `True`).

No Gemini calls are made in this section. This is pure data wiring and mock data.

## File Layout

```
core/
  simulation/
    retrieve.py          # retrieve_for_persona() + mock/real dispatch
    mock_corpus.py       # ~50 demo chunks + get_community_labels()
tests/
  test_retrieval_mock.py # All tests for this section
```

## Data Model: RetrievalResult

A lightweight model representing a single retrieved chunk. This is NOT the full `ChunkExtraction` schema; it is a slimmed-down view used during simulation.

**File: `schemas/retrieval.py`** (or add to an existing schemas file)

```python
class RetrievalResult(BaseModel):
    """A single retrieved evidence chunk for simulation use."""
    chunk_id: str
    text: str
    facet: str          # one of the facet literals
    stance: str         # one of the stance literals
    community_id: str   # graph community label from WS1 (or mock)
```

The `chunk_id` field is critical because it is referenced later by `PersonaResponse.cited_chunk_ids` for evidence grounding validation.

## Tests (Write First)

**File: `/Users/bhavyapatel/Documents/Projects/focus-group-agent/tests/test_retrieval_mock.py`**

All tests should be written before implementation. The test file covers both the mock corpus and the `retrieve_for_persona` wrapper.

```python
"""Tests for the retrieval mock layer and retrieve_for_persona wrapper."""
import pytest

# Test: mock retrieve returns chunks filtered by facet
# - Call the mock retrieval function requesting facet="camera"
# - Assert all returned chunks have facet="camera"

# Test: mock retrieve returns at most top_k results
# - Call mock retrieval with top_k=5
# - Assert len(results) <= 5

# Test: mock get_community_labels returns dict mapping entity_id to community_id
# - Call get_community_labels()
# - Assert return type is dict[str, str]
# - Assert it has at least one entry

# Test: demo corpus has chunks for all facets (camera, battery, price, design, privacy, ecosystem)
# - Import the demo corpus
# - Collect all unique facets present
# - Assert each of the 6 required facets appears at least once

# Test: mock layer activates when USE_MOCK_RETRIEVAL=True
# - With env var USE_MOCK_RETRIEVAL=True (or default), call retrieve_for_persona
# - Assert it returns results without error (uses mock backend)

# Test: mock layer does NOT activate when USE_MOCK_RETRIEVAL=False
# - With env var USE_MOCK_RETRIEVAL=False, call retrieve_for_persona
# - Assert it raises ImportError or similar (WS1 module not available)
# - The key point: no try/except fallback to mock; it fails loudly

# Test: retrieve_for_persona returns list of RetrievalResult
# - Provide a minimal Persona and Scenario
# - Call retrieve_for_persona in mock mode
# - Assert return type is list[RetrievalResult]
# - Assert each item has non-empty chunk_id, text, facet, stance, community_id

# Test: retrieve_for_persona constructs query from persona keywords + scenario
# - This is a behavioral test: provide a persona with feature_priorities
#   keyed on "camera" and "battery", and a scenario about phones
# - Assert returned chunks are biased toward those facets (majority match)

# Test: retrieve_for_persona filters by persona's facets
# - Provide a persona whose feature_priorities only include "privacy"
# - Assert returned chunks are predominantly "privacy" facet

# Test: retrieve_for_persona returns at most 10 chunks (default top_k)
# - Call with default arguments
# - Assert len(results) <= 10
```

## Implementation Details

### 1. Demo Corpus (`core/simulation/mock_corpus.py`)

This file contains a hardcoded list of ~50 short text chunks simulating consumer opinions about a flagship phone launch. Each chunk is a dictionary with fields: `chunk_id`, `text`, `facet`, `stance`, and `community_id`.

**Distribution of chunks by facet:**

| Facet | Count | Content Mix |
|-------|-------|-------------|
| camera | 10 | Mix of positive reviews praising zoom/night mode, negative complaints about processing, rumors about sensor upgrades |
| battery | 8 | Positive about all-day battery, negative about charging speed, mixed about wireless charging tradeoffs |
| price | 8 | Negative sticker shock, positive value comparisons, mixed upgrade-vs-wait opinions |
| design | 8 | Positive about materials/feel, negative about weight/size, mixed about color options |
| privacy | 6 | Concerns about data collection, positive about on-device processing, negative about cloud requirements |
| ecosystem | 5 | Lock-in frustrations, positive about cross-device features, mixed about switching costs |
| other | 5 | General excitement, skepticism, comparisons to competitors |

Each chunk should be 2-4 sentences of realistic consumer opinion text. The `chunk_id` should follow the pattern `mock-{facet}-{index}` (e.g., `mock-camera-01`). The `community_id` should group related chunks (e.g., all camera chunks might be `community-camera` or split into `community-camera-pos` and `community-camera-neg`).

**Stance values** use the same literals as the schema: `positive`, `negative`, `mixed`, `rumor`, `review`.

The module should expose:

```python
DEMO_CHUNKS: list[dict]
"""~50 demo chunks about consumer electronics opinions."""

def mock_retrieve(
    query_facets: list[str],
    top_k: int = 10,
) -> list[dict]:
    """Return demo chunks filtered by facet, up to top_k.

    If query_facets is empty, return a random sample across all facets.
    Otherwise, filter to chunks matching any of the given facets,
    then return up to top_k results. If fewer than top_k match,
    pad with random chunks from other facets.
    """

def get_community_labels() -> dict[str, str]:
    """Return a mapping of entity_id -> community_id from the demo corpus.

    In the real system, WS1 provides this from the knowledge graph.
    The mock version derives it from the demo chunks' community_id fields.
    """
```

### 2. Retrieve For Persona Wrapper (`core/simulation/retrieve.py`)

This is the main interface consumed by the simulation orchestrator (section-08). It dispatches to either the mock corpus or WS1's real retrieval function based on the `USE_MOCK_RETRIEVAL` config setting.

**Key design decisions:**
- When `USE_MOCK_RETRIEVAL=False`, import WS1's module directly at call time. If WS1 is not available, let the `ImportError` propagate. No `try/except` fallback. No auto-detection. This is intentional per the plan: "let it fail loudly if unavailable."
- When `USE_MOCK_RETRIEVAL=True` (the default), call `mock_retrieve()` from `mock_corpus.py`.
- The wrapper converts raw dict results into `RetrievalResult` Pydantic models before returning.

```python
async def retrieve_for_persona(
    persona: Persona,
    scenario: Scenario,
    project_id: str,
    top_k: int = 10,
) -> list[RetrievalResult]:
    """Retrieve evidence relevant to this persona's perspective on the scenario.

    Constructs a query combining persona segment keywords with scenario hypotheses.
    Filters by facets in persona's feature_priorities.
    Returns up to top_k chunks as RetrievalResult objects.

    Dispatches to mock or WS1 based on USE_MOCK_RETRIEVAL config.
    """
```

**Query construction logic (mock mode):**
1. Extract facet keys from `persona.feature_priorities` (e.g., `{"camera": 0.8, "battery": 0.6}` yields `["camera", "battery"]`).
2. If the persona has no feature_priorities, fall back to `scenario.facets_to_explore`.
3. Pass these facets to `mock_retrieve()` along with `top_k`.
4. Convert each returned dict to a `RetrievalResult` model.

**Query construction logic (real mode):**
1. Build a query string from persona's `segment_label`, top beliefs' claims, and the scenario's `product_name` + `description`.
2. Pass to WS1's `retrieve()` function along with facet filters and `top_k`.
3. Convert WS1's response format to `RetrievalResult` models.

### 3. Config Integration

The `USE_MOCK_RETRIEVAL` setting is defined in `config.py` (section-02). For this section, simply import and read it:

```python
from config import settings
# settings.USE_MOCK_RETRIEVAL -> bool, default True
```

No changes to `config.py` are needed in this section; the field is already defined there by section-02.

## Acceptance Criteria

1. All tests in `test_retrieval_mock.py` pass.
2. The demo corpus contains at least 50 chunks with realistic consumer electronics opinion text.
3. Every required facet (camera, battery, price, design, privacy, ecosystem) has at least 3 chunks.
4. `mock_retrieve()` correctly filters by facet and respects `top_k`.
5. `get_community_labels()` returns a non-empty dict mapping entity IDs to community IDs.
6. `retrieve_for_persona()` returns `list[RetrievalResult]` with all fields populated.
7. When `USE_MOCK_RETRIEVAL=False` and WS1 is absent, calling `retrieve_for_persona()` raises an `ImportError` (no silent fallback).
8. When `USE_MOCK_RETRIEVAL=True` (default), `retrieve_for_persona()` returns mock data without error.

## Implementation Notes

- The demo corpus text should sound like real social media posts, reviews, and forum comments. Vary the tone and length. Include some typos or informal language for realism.
- Community IDs in the mock should create at least 3-4 distinct communities (not one per facet; some facets should share a community to exercise clustering downstream).
- The `chunk_id` values must be deterministic and stable across runs so that tests can assert on specific IDs if needed.
- This section makes zero LLM calls. It is pure Python data structures and filtering logic.