The project has no source code yet -- this is a greenfield implementation. Now I have all the context I need to write the section.

# Section 12: TRIBE Heuristic Scoring

## Overview

This section implements the TRIBE (Trust, Response, Insight, Belief, Evidence) heuristic scoring system. TRIBE computes three numeric metrics from simulation outputs -- `response_strength`, `response_variance`, and `response_spread` -- and produces a short narrative interpretation via hard-coded string templates. There are **no LLM calls** in this section; it is pure numeric computation and string formatting.

TRIBE scoring is **feature-flagged** via the `TRIBE_ENABLED` environment variable (default `False`). When disabled, the orchestrator skips the scoring phase entirely, and the `tribe` field on `DashboardPayload` is `None`.

## Dependencies

- **Section 01 (Schemas)**: This section depends on the following Pydantic models being defined:
  - `PersonaResponse` (from `schemas/simulation.py`): specifically the `adoption_likelihood_0_100` (int, 0-100) and `feature_scores` (dict[str, float]) fields
  - `TribeResult` (from `schemas/dashboard.py`): the output model with fields `enabled` (bool), `response_strength` (float), `response_variance` (float), `response_spread` (float), `scored_text` (str)
  - `Scenario` (from `schemas/scenario.py`): passed through for context, though TRIBE scoring primarily uses the `PersonaResponse` data
- **Section 04 (Config)**: The `TRIBE_ENABLED` boolean flag from `config.py` (Pydantic `BaseSettings`), defaulting to `False`

No other sections are required. TRIBE scoring is a leaf node that only reads simulation outputs and produces a `TribeResult`.

## Files to Create

| File | Purpose |
|------|---------|
| `core/scoring/__init__.py` | Package init (empty) |
| `core/scoring/heuristics.py` | Three metric computation functions |
| `core/scoring/tribe_runner.py` | `score_tribe()` entry point assembling `TribeResult` |
| `tests/test_tribe_scoring.py` | All unit tests for TRIBE scoring |

## Tests (Write First)

All tests go in `tests/test_tribe_scoring.py`. Use `pytest` (no async needed since TRIBE scoring is pure computation, though the runner function is declared async for consistency with the orchestrator interface).

```python
"""Tests for TRIBE heuristic scoring.

File: tests/test_tribe_scoring.py
"""
import pytest

# ---------------------------------------------------------------------------
# response_strength tests
# ---------------------------------------------------------------------------

# Test: response_strength = 0.0 when all likelihoods are 50
#   Setup: list of PersonaResponse objects all with adoption_likelihood_0_100 = 50
#   Assert: response_strength(responses) == 0.0

# Test: response_strength = 1.0 when all likelihoods are 0 or 100
#   Setup: responses with likelihoods [0, 100, 0, 100]
#   Assert: response_strength(responses) == 1.0

# Test: response_strength is between 0 and 1 for mixed likelihoods
#   Setup: responses with likelihoods [30, 70, 50, 80]
#   Assert: 0.0 < response_strength(responses) < 1.0

# ---------------------------------------------------------------------------
# response_variance tests
# ---------------------------------------------------------------------------

# Test: response_variance = 0.0 when all likelihoods are equal
#   Setup: responses all with adoption_likelihood_0_100 = 75
#   Assert: response_variance(responses) == 0.0

# Test: response_variance increases with spread of likelihoods
#   Setup: narrow = [48, 50, 52], wide = [10, 50, 90]
#   Assert: response_variance(narrow_responses) < response_variance(wide_responses)

# Test: response_variance is clamped to [0, 1]
#   Setup: extreme likelihoods [0, 100]
#   Assert: 0.0 <= response_variance(responses) <= 1.0

# ---------------------------------------------------------------------------
# response_spread tests
# ---------------------------------------------------------------------------

# Test: response_spread = 0.0 when all personas have same feature scores
#   Setup: all responses with feature_scores = {"camera": 0.8, "battery": 0.6}
#   Assert: response_spread(responses) == 0.0

# Test: response_spread increases with feature score divergence
#   Setup: uniform_responses vs divergent_responses on same facets
#   Assert: response_spread(uniform) < response_spread(divergent)

# Test: response_spread handles missing facets gracefully
#   Setup: one response has {"camera": 0.8}, another has {"battery": 0.6}
#   Assert: does not raise; returns a valid float in [0, 1]

# ---------------------------------------------------------------------------
# scored_text tests
# ---------------------------------------------------------------------------

# Test: scored_text uses hard-coded templates based on score ranges
#   Setup: known scores producing specific range buckets
#   Assert: returned text contains expected template phrases

# Test: scored_text handles all-low scores (all near 0)
#   Assert: text indicates weak/neutral reactions

# Test: scored_text handles all-high scores (all near 1)
#   Assert: text indicates strong polarization

# ---------------------------------------------------------------------------
# score_tribe integration tests
# ---------------------------------------------------------------------------

# Test: score_tribe returns TribeResult with all fields populated
#   Setup: valid list of PersonaResponse objects and a Scenario
#   Assert: result.enabled is True, all three scores are floats in [0, 1], scored_text is non-empty

# Test: TribeResult.enabled = True when scores computed
#   Assert: result.enabled is True regardless of score values

# Test: score_tribe with single persona produces valid result
#   Setup: only one PersonaResponse
#   Assert: no division by zero; returns valid TribeResult

# Test: score_tribe with empty feature_scores produces valid result
#   Setup: PersonaResponse objects with empty feature_scores dicts
#   Assert: response_spread is 0.0, other scores still computed correctly
```

## Implementation Details

### `core/scoring/heuristics.py`

This module contains three pure functions, each computing one TRIBE metric. All operate on lists of `PersonaResponse` objects.

#### `response_strength(responses: list[PersonaResponse]) -> float`

Measures how strongly personas reacted (positive or negative) versus neutrality.

**Formula**: `mean(|adoption_likelihood_0_100 - 50|) / 50`

- Extract `adoption_likelihood_0_100` from each response
- Compute absolute deviation from 50 (the neutral midpoint) for each
- Take the mean of those deviations
- Divide by 50 to normalize to [0, 1]
- Result: 0.0 means all neutral (all at 50), 1.0 means all extreme (all at 0 or 100)

#### `response_variance(responses: list[PersonaResponse]) -> float`

Measures disagreement between personas.

**Formula**: `std(adoption_likelihoods) / 50`

- Extract `adoption_likelihood_0_100` from each response
- Compute standard deviation (use population stddev, i.e., `ddof=0` since we want the spread of this specific panel, not an estimate of a larger population)
- Divide by 50 (theoretical maximum stddev when values are 0 and 100)
- Clamp result to [0, 1]
- Result: 0.0 means perfect agreement, 1.0 means maximum polarization

#### `response_spread(responses: list[PersonaResponse]) -> float`

Measures polarization across feature dimensions.

**Formula**: For each facet present in any response's `feature_scores`, compute `(max - min)` across personas that have that facet. Then take the mean of those per-facet ranges.

- Collect all unique facet keys across all responses' `feature_scores`
- For each facet, gather all scores from responses that include it
- If only one response has a facet, skip it (no spread measurable) or treat spread as 0
- Compute `max_score - min_score` for each facet
- Average the per-facet spreads
- Clamp to [0, 1] (feature_scores are already 0-1 floats, so the range is naturally bounded)
- Result: 0.0 means all personas agree on feature quality, 1.0 means complete disagreement on every facet

### `core/scoring/tribe_runner.py`

This module contains the entry-point function that wires together the three heuristics and produces the narrative text.

#### `score_tribe(round2_responses: list[PersonaResponse], scenario: Scenario) -> TribeResult`

This function is declared `async` for consistency with the orchestrator's phase function signatures, but performs no I/O.

Steps:
1. Call `response_strength(round2_responses)` to get the strength score
2. Call `response_variance(round2_responses)` to get the variance score
3. Call `response_spread(round2_responses)` to get the spread score
4. Generate `scored_text` from hard-coded templates based on score ranges
5. Return `TribeResult(enabled=True, response_strength=..., response_variance=..., response_spread=..., scored_text=...)`

#### Scored Text Template Logic

The `scored_text` field is built by concatenating interpretive sentences for each metric. Use threshold-based bucketing:

**For `response_strength`:**
- `< 0.3`: "Personas showed **mild reactions** to this concept -- the product does not provoke strong feelings."
- `0.3 - 0.6`: "Personas showed **moderate reactions** -- the product generates meaningful engagement."
- `> 0.6`: "Personas showed **strong reactions** -- this concept provokes intense feelings (positive or negative)."

**For `response_variance`:**
- `< 0.3`: "The panel **largely agrees** on their overall assessment."
- `0.3 - 0.6`: "There is **notable disagreement** between personas on the overall product appeal."
- `> 0.6`: "**Strong polarization** detected -- personas have very different reactions to this concept."

**For `response_spread`:**
- `< 0.3`: "Feature-level opinions are **relatively aligned** across the panel."
- `0.3 - 0.6`: "Some features show **divergent opinions** -- consider targeted messaging."
- `> 0.6`: "Features are **highly polarizing** -- different segments value very different aspects."

Concatenate the three sentences with a single space between them.

### Feature Flag Behavior

The `TRIBE_ENABLED` flag from `config.py` controls whether TRIBE scoring runs:

- **In the orchestrator** (section 06/08 -- not implemented here, but relevant context): when `TRIBE_ENABLED` is `False`, the orchestrator skips the `SCORING` phase entirely. When `True`, it calls `score_tribe()` and attaches the result to the simulation state.
- **In the dashboard assembly** (section 10): when TRIBE was not run, `DashboardPayload.tribe` is set to `None`. When it was run, the `TribeResult` is included.
- **In the API route** (section 11): `POST /api/projects/{id}/tribe/score` checks `TRIBE_ENABLED` and returns 400 if disabled.

This section only implements the scoring logic itself. The feature-flag wiring in the orchestrator, dashboard, and routes is handled by their respective sections. However, the `score_tribe()` function should be safe to call regardless of the flag -- the flag gating happens at the call site.

### Edge Cases to Handle

1. **Single persona**: Standard deviation is 0, so `response_variance` is 0.0. `response_strength` still computes correctly. `response_spread` with one persona means all per-facet ranges are 0.
2. **Empty responses list**: Guard against division by zero. If empty, return `TribeResult(enabled=True, response_strength=0.0, response_variance=0.0, response_spread=0.0, scored_text="No responses to score.")`.
3. **Empty `feature_scores`**: If no response has any feature scores, `response_spread` returns 0.0.
4. **Facets present in only one response**: Those facets contribute 0.0 to the spread (or are skipped).

### Package Init

`core/scoring/__init__.py` should be an empty file (or re-export `score_tribe` for convenience).

## Verification Checklist

After implementation, verify:

- [ ] All tests in `tests/test_tribe_scoring.py` pass with `uv run pytest tests/test_tribe_scoring.py`
- [ ] `response_strength` returns 0.0 for all-50 likelihoods and 1.0 for all-extreme likelihoods
- [ ] `response_variance` returns 0.0 for identical likelihoods
- [ ] `response_spread` returns 0.0 for identical feature scores
- [ ] `scored_text` produces human-readable narrative for any valid score combination
- [ ] `score_tribe` never raises for valid inputs (including edge cases)
- [ ] All returned floats are clamped to [0, 1]
- [ ] `TribeResult` Pydantic model validates cleanly from `score_tribe` output
- [ ] No LLM calls anywhere in this section -- pure computation only