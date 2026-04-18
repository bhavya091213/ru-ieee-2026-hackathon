Now let me check the index.md again for the specific section-10 entry and its dependencies to be thorough.

Now I have all the context I need. Let me assemble the section content. The section is about **Dashboard Assembly** -- building the `DashboardPayload` from simulation state, with score formulas, quote extraction, feature aggregation, and `PersonaSummary` construction.

Key dependencies: section-01 (schemas), section-06 (orchestrator state), section-08 (simulation rounds), section-09 (moderator-analyst).

The relevant tests are in the "Dashboard Assembly" subsection of section 7 in the TDD plan. The relevant implementation details are in the "Dashboard Payload Assembly" part of section 7 in the plan.

# Section 10: Dashboard Assembly

## Overview

This section implements the `assemble_dashboard()` function that transforms raw simulation state into a fully populated `DashboardPayload` ready for the frontend (WS3). After all simulation phases complete (retrieval, round 1, moderator, round 2, analyst, and optional TRIBE scoring), the dashboard assembly step computes aggregate scores, extracts quote cards, builds per-facet feature score rows, and constructs persona summaries.

This is a pure data-transformation layer -- no LLM calls, no I/O. It reads from the completed `SimulationState` and produces the `DashboardPayload` schema that the `/api/projects/{id}/dashboard` route will serve.

## Dependencies

- **section-01-schemas**: Provides `DashboardPayload`, `PersonaSummary`, `QuoteCard`, `ScoredLabel`, `FeatureScoreRow`, `TribeResult`, `PersonaResponse`, `Persona`, `AnalystSummary`, `ModeratorQuestion`.
- **section-06-orchestrator-state**: Provides `SimulationState` frozen dataclass containing all simulation outputs (personas, round 1/2 responses, moderator question, analyst summary).
- **section-08-simulation-rounds**: Provides the round 1 and round 2 `PersonaResponse` lists stored in the simulation state.
- **section-09-moderator-analyst**: Provides the `ModeratorQuestion` and `AnalystSummary` stored in the simulation state.

## File to Create

**`core/simulation/dashboard.py`**

This module contains the `assemble_dashboard()` function and all helper functions for score computation.

## Tests (Write First)

All tests go in **`tests/test_dashboard_assembly.py`**. These tests verify the mathematical formulas, data extraction logic, and schema compliance of the assembly process. Every test uses synthetic inputs -- no mocking of external services is needed since dashboard assembly is pure computation.

```python
# tests/test_dashboard_assembly.py

import statistics
from core.simulation.dashboard import (
    assemble_dashboard,
    compute_consensus_score,
    compute_disagreement_score,
    compute_evidence_coverage,
    extract_quotes,
    aggregate_feature_scores,
    build_persona_summaries,
)

# --- consensus_score tests ---

# Test: consensus_score = 1 - (std(likelihoods) / 50), clamped [0, 1]
#   Given likelihoods [60, 70, 80], compute std, apply formula, verify result.

# Test: consensus_score = 1.0 when all personas have same likelihood
#   Given likelihoods [75, 75, 75], std=0, formula yields 1.0.

# Test: consensus_score = 0.0 when max disagreement (0 and 100)
#   Given likelihoods [0, 100], std=50, formula yields 0.0.
#   Also verify clamping: likelihoods [0, 0, 100, 100] have std ~57.7, raw formula
#   would go negative, result should clamp to 0.0.

# --- disagreement_score tests ---

# Test: disagreement_score = mean of per-facet std, clamped [0, 1]
#   Given 3 personas with feature_scores for facets "camera" and "battery",
#   compute std per facet, then mean of those stds. Verify against hand-calculated value.

# Test: disagreement_score = 0.0 when all personas agree on all facets
#   All personas have identical feature_scores -> std per facet is 0 -> mean is 0.

# --- evidence_coverage tests ---

# Test: evidence_coverage = fraction of personas with >=3 cited chunks in round2
#   Given 4 personas, 3 have >=3 unique cited_chunk_ids in round2, coverage = 0.75.

# Test: evidence_coverage = 0.0 when no persona has >=3 cited chunks

# Test: evidence_coverage = 1.0 when all personas have >=3 cited chunks

# --- quote extraction tests ---

# Test: quotes extracted from quotable_sentence fields
#   Given round2 PersonaResponses each with a quotable_sentence, extract_quotes
#   produces one QuoteCard per persona with correct persona_id, segment_label, quote.

# Test: quotes skip empty quotable_sentence
#   If a PersonaResponse has quotable_sentence="" or None, it should be omitted.

# --- feature_scores aggregation tests ---

# Test: feature_scores aggregated correctly (mean, min, max, std per facet)
#   Given 3 personas with camera scores [0.8, 0.6, 0.7], verify:
#     mean=0.7, min=0.6, max=0.8, std=statistics.stdev([0.8, 0.6, 0.7])
#   Also verify persona_scores dict maps persona_id -> score.

# Test: facets appearing in only some personas still aggregate correctly
#   If only 2 of 3 personas have "privacy" scores, compute stats from those 2.

# --- PersonaSummary construction tests ---

# Test: PersonaSummary built from persona + round2 response
#   Verify that PersonaSummary contains the persona's segment_label, summary,
#   top beliefs, the round2 adoption_likelihood, strongest_positive, strongest_concern.

# --- Full assembly tests ---

# Test: DashboardPayload validates cleanly against schema
#   Construct a full SimulationState with synthetic data, call assemble_dashboard(),
#   verify the result is a valid DashboardPayload via .model_validate().

# Test: assemble_dashboard with tribe=None produces DashboardPayload with tribe=None

# Test: assemble_dashboard with TribeResult populates tribe field correctly
```

## Implementation Details

### Function Signatures

```python
# core/simulation/dashboard.py

from schemas.dashboard import (
    DashboardPayload,
    PersonaSummary,
    QuoteCard,
    ScoredLabel,
    FeatureScoreRow,
    TribeResult,
)
from schemas.simulation import PersonaResponse, AnalystSummary, ModeratorQuestion
from schemas.persona import Persona


def compute_consensus_score(adoption_likelihoods: list[float]) -> float:
    """Compute consensus score from adoption likelihoods.

    Formula: 1 - (std(likelihoods) / 50), clamped to [0, 1].
    Higher score means more agreement among personas.

    If fewer than 2 likelihoods provided, returns 1.0 (trivial consensus).
    """


def compute_disagreement_score(
    round2_responses: list[PersonaResponse],
) -> float:
    """Compute disagreement score across feature facets.

    For each facet present in any persona's feature_scores, compute the standard
    deviation of scores across personas that rated that facet. Then take the mean
    of all per-facet standard deviations.

    Result clamped to [0, 1]. Higher means more polarization.
    """


def compute_evidence_coverage(
    round2_responses: list[PersonaResponse],
) -> float:
    """Compute fraction of personas with adequate evidence grounding.

    A persona has adequate grounding if they have >= 3 unique cited_chunk_ids
    in their round 2 response.

    Returns: float in [0, 1].
    """


def extract_quotes(
    round2_responses: list[PersonaResponse],
    personas: list[Persona],
) -> list[QuoteCard]:
    """Extract quotable sentences from round 2 responses into QuoteCards.

    Skips responses with empty or None quotable_sentence.
    Each QuoteCard includes: persona_id, segment_label (from persona),
    quote (the quotable_sentence), facet (persona's top-priority facet),
    sentiment (derived from adoption_likelihood: >60 positive, <40 negative, else mixed).
    """


def aggregate_feature_scores(
    round2_responses: list[PersonaResponse],
) -> dict[str, FeatureScoreRow]:
    """Aggregate per-persona feature scores into FeatureScoreRow per facet.

    For each facet, collect all persona scores, compute mean, min, max, std.
    Also populate persona_scores: dict mapping persona_id to their score for that facet.
    """


def build_persona_summaries(
    personas: list[Persona],
    round2_responses: list[PersonaResponse],
) -> list[PersonaSummary]:
    """Construct PersonaSummary objects from personas and their round 2 responses.

    Each summary includes: persona_id, segment_label, summary, top beliefs,
    adoption_likelihood, strongest_positive, strongest_concern, feature_scores
    from the round 2 response.
    """


def assemble_dashboard(
    personas: list[Persona],
    round1_responses: list[PersonaResponse],
    round2_responses: list[PersonaResponse],
    moderator_question: ModeratorQuestion,
    analyst_summary: AnalystSummary,
    tribe_result: TribeResult | None = None,
) -> DashboardPayload:
    """Build the complete DashboardPayload from simulation outputs.

    This is the main entry point called by the orchestrator after all phases complete.
    Orchestrates all helper functions and assembles the final payload.

    Steps:
    1. Extract adoption_likelihoods from round2_responses
    2. Compute consensus_score, disagreement_score, evidence_coverage
    3. Extract quotes from round2 responses
    4. Aggregate feature scores across personas
    5. Build persona summaries
    6. Package analyst_summary fields into ScoredLabel lists
    7. Attach tribe_result (may be None)
    8. Return validated DashboardPayload
    """
```

### Score Formulas (Exact Specifications)

**consensus_score**:
- Extract `adoption_likelihood_0_100` from each round 2 `PersonaResponse`
- Compute `std` using `statistics.stdev()` (sample standard deviation) if 2+ values, else 0.0
- Apply formula: `1.0 - (std_val / 50.0)`
- Clamp result to `[0.0, 1.0]` using `max(0.0, min(1.0, result))`
- Interpretation: 1.0 means perfect agreement, 0.0 means maximum disagreement

**disagreement_score**:
- Collect all unique facet keys across all round 2 `PersonaResponse.feature_scores`
- For each facet, gather all persona scores for that facet (skip personas that did not rate it)
- Compute `statistics.stdev()` of those scores (need 2+ values, else treat as 0.0)
- Take the mean of all per-facet standard deviations
- Clamp to `[0.0, 1.0]`
- Interpretation: 1.0 means extreme polarization across features, 0.0 means total agreement

**evidence_coverage**:
- For each round 2 `PersonaResponse`, count the number of unique entries in `cited_chunk_ids`
- A persona is "adequately grounded" if they have >= 3 unique cited chunk IDs
- Compute: `count(adequately_grounded) / total_personas`
- Clamp to `[0.0, 1.0]`
- Interpretation: 1.0 means every persona cited at least 3 evidence chunks

### Quote Extraction Logic

For each round 2 response:
1. Check if `quotable_sentence` is non-empty and not None
2. Look up the corresponding `Persona` by `persona_id`
3. Determine the persona's top-priority facet from `feature_priorities` (the key with the highest value)
4. Determine sentiment from `adoption_likelihood_0_100`: above 60 is `"positive"`, below 40 is `"negative"`, otherwise `"mixed"`
5. Create a `QuoteCard` with `persona_id`, `segment_label`, `quote=quotable_sentence`, `facet`, `sentiment`

### Feature Score Aggregation Logic

1. Iterate over all round 2 responses
2. For each response, iterate over `feature_scores` (dict of facet -> float)
3. Group scores by facet across all personas
4. For each facet, compute:
   - `mean`: arithmetic mean of all scores
   - `min`: minimum score
   - `max`: maximum score
   - `std`: sample standard deviation (0.0 if only one value)
   - `persona_scores`: dict mapping each persona_id to their score
5. Return a `dict[str, FeatureScoreRow]` keyed by facet name

### PersonaSummary Construction

For each persona, find the matching round 2 response (by `persona_id`) and build a `PersonaSummary` containing:
- `persona_id`: from the persona
- `segment_label`: from the persona
- `summary`: from the persona
- `beliefs`: the persona's belief list (already filtered during synthesis in section-05)
- `adoption_likelihood`: from the round 2 response's `adoption_likelihood_0_100`
- `strongest_positive`: from the round 2 response
- `strongest_concern`: from the round 2 response
- `feature_scores`: from the round 2 response

### ScoredLabel Packaging

The `AnalystSummary` contains `top_risks` and `top_wins` as lists of strings. These need to be converted to `ScoredLabel` objects for the dashboard. Since the analyst does not assign numeric scores to these, assign descending scores based on list position (first item gets highest score). For example, if there are 5 risks, assign scores `[1.0, 0.8, 0.6, 0.4, 0.2]`. This preserves the analyst's priority ordering while giving the frontend a numeric value for visualization.

### Integration with the Orchestrator

The orchestrator (from section-06) calls `assemble_dashboard()` as the final step after all phases complete. The call site in the orchestrator looks conceptually like:

```python
# In core/simulation/orchestrator.py, after ANALYST phase completes:
dashboard = assemble_dashboard(
    personas=state.personas,
    round1_responses=state.round1_responses,
    round2_responses=state.round2_responses,
    moderator_question=state.moderator_question,
    analyst_summary=state.analyst_summary,
    tribe_result=state.tribe_result,  # None if TRIBE disabled
)
# Store dashboard on the project for retrieval via GET /dashboard
```

The `DashboardPayload` is then cached on the `Project` object in the in-memory store, where the `/api/projects/{id}/dashboard` route (section-11) retrieves and returns it directly.

### Edge Cases to Handle

- **Single persona**: `statistics.stdev()` requires at least 2 values. If there is only one persona, consensus_score should be 1.0, disagreement_score should be 0.0, and evidence_coverage is either 0.0 or 1.0.
- **No feature scores**: If no persona rated any facet, `aggregate_feature_scores` returns an empty dict.
- **Missing round 2 response for a persona**: If a persona has no matching round 2 response (should not happen in normal flow, but defensive coding), skip it during summary construction and log a warning.
- **Empty quotable_sentence**: Skip during quote extraction; do not create a QuoteCard with an empty quote.
- **Facets rated by only one persona**: Treat std as 0.0 for that facet in disagreement_score.
- **tribe_result is None**: The `DashboardPayload.tribe` field should be set to `None`. This is the normal case when `TRIBE_ENABLED=False`.

### Design Principles

- **Pure functions**: All helper functions are pure -- they take data in and return data out, with no side effects or I/O. This makes them trivially testable.
- **Immutability**: No mutation of input data. All computations produce new objects.
- **Defensive clamping**: All scores are explicitly clamped to `[0.0, 1.0]` even if the formula should theoretically produce values in range. This guards against floating-point edge cases.
- **Schema validation**: The final `DashboardPayload` is constructed via Pydantic, which provides automatic validation. If any field is malformed, a validation error will surface immediately.