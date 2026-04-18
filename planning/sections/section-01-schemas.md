Now I have all the context needed. Let me produce the section content.

# Section 01: Pydantic Schemas

## Overview

This section defines every Pydantic v2 schema used across Workstream 2 (AI Engine). These schemas form the foundational contract between WS1 (data pipeline), WS2 (AI engine), and WS3 (frontend dashboard). All other sections depend on this one; nothing depends on anything else here.

The schemas live in `apps/api/schemas/` and cover six modules: chunk extraction, personas, scenarios, simulation outputs, dashboard payload, and project metadata.

**Key design principle:** Use `Literal` string types instead of Python `Enum` classes. Gemini's structured JSON output works best with plain string literals. All float scores are 0-1 unless explicitly noted (e.g., `adoption_likelihood` is 0-100 for readability).

---

## Dependencies

- **None.** This is the foundation section with zero dependencies.
- **Blocks:** Every other section (02 through 13) depends on these schemas.

---

## Files to Create

```
apps/
  api/
    schemas/
      __init__.py      # Re-export all public models
      chunk.py         # ChunkExtraction, ExtractedEntity, ExtractedRelationship
      persona.py       # Persona, Belief, SkepticismProfile
      scenario.py      # Scenario (with validators)
      simulation.py    # PersonaResponse, ModeratorQuestion, AnalystSummary
      dashboard.py     # DashboardPayload, PersonaSummary, QuoteCard, ScoredLabel, FeatureScoreRow, TribeResult
      project.py       # Project
tests/
  schemas/
    __init__.py
    test_chunk.py
    test_persona.py
    test_scenario.py
    test_simulation.py
    test_dashboard.py
    test_project.py
    test_json_schema_export.py
```

All paths are relative to the project root at `/Users/bhavyapatel/Documents/Projects/focus-group-agent`.

---

## Tests (Write First)

Write these tests before any schema implementation. Use `pytest` as the test framework. Each test file corresponds to one schema module.

### `tests/schemas/test_chunk.py`

```python
"""Tests for chunk extraction schemas."""

# Test: ChunkExtraction roundtrip serialize/deserialize with all fields populated
# Test: ChunkExtraction rejects invalid facet literal (e.g., "invalid_facet")
# Test: ChunkExtraction rejects invalid stance literal (e.g., "invalid_stance")
# Test: ExtractedEntity rejects invalid type literal (e.g., "InvalidType")
# Test: ExtractedRelationship rejects invalid type literal (e.g., "INVALID_REL")
```

Construct a fully-populated `ChunkExtraction` instance, call `.model_dump()` then `ChunkExtraction.model_validate()` on the dict, and assert equality. For rejection tests, use `pytest.raises(pydantic.ValidationError)` when passing an invalid literal string to the relevant field.

### `tests/schemas/test_persona.py`

```python
"""Tests for persona schemas."""

# Test: Persona with graph_entity_ids serializes correctly
# Test: Belief with empty evidence_chunk_ids is valid (filtering happens in synthesis, not schema)
```

Verify that a `Persona` with a non-empty `graph_entity_ids` list roundtrips through `model_dump()` / `model_validate()`. Verify that a `Belief` with `evidence_chunk_ids=[]` does not raise a validation error (the minimum-2 rule is enforced at the synthesis layer, not at the schema layer).

### `tests/schemas/test_scenario.py`

```python
"""Tests for scenario schemas with custom validators."""

# Test: Scenario validator rejects empty product_name (empty string or whitespace-only)
# Test: Scenario validator rejects product_name > 200 chars
# Test: Scenario validator rejects > 10 hypotheses
# Test: Scenario validator rejects hypothesis > 500 chars
# Test: Scenario validator rejects invalid facet in facets_to_explore
# Test: Valid scenario with all fields passes validation
```

These tests exercise Pydantic `field_validator` or `model_validator` logic. Each rejection test should use `pytest.raises(pydantic.ValidationError)` and optionally check the error message or error type.

### `tests/schemas/test_simulation.py`

```python
"""Tests for simulation output schemas."""

# Test: PersonaResponse roundtrip with all fields populated
```

Build a complete `PersonaResponse` with realistic data, serialize, deserialize, and assert field-level equality.

### `tests/schemas/test_dashboard.py`

```python
"""Tests for dashboard payload schemas."""

# Test: DashboardPayload with tribe=None serializes correctly (tribe field is Optional)
# Test: DashboardPayload with TribeResult populated serializes correctly
# Test: ScoredLabel roundtrip
# Test: FeatureScoreRow roundtrip
# Test: QuoteCard roundtrip
```

Test that `DashboardPayload` works with both `tribe=None` and a fully populated `TribeResult`. Verify the smaller helper models (`ScoredLabel`, `FeatureScoreRow`, `QuoteCard`) individually.

### `tests/schemas/test_json_schema_export.py`

```python
"""Tests that all schema models export to JSON Schema (for Gemini response_schema)."""

# Test: All schema models export to JSON Schema successfully
```

Iterate over every public model class and call `.model_json_schema()`. Assert the result is a dict with a `"properties"` key (or `"$defs"` for complex models). This catches Gemini compatibility issues early -- any schema that fails JSON Schema export will also fail as a Gemini `response_schema`.

The list of models to test:

- `ChunkExtraction`, `ExtractedEntity`, `ExtractedRelationship`
- `Persona`, `Belief`, `SkepticismProfile`
- `Scenario`
- `PersonaResponse`, `ModeratorQuestion`, `AnalystSummary`
- `DashboardPayload`, `PersonaSummary`, `QuoteCard`, `ScoredLabel`, `FeatureScoreRow`, `TribeResult`
- `Project`

---

## Implementation Details

### Shared Type Aliases

Define facet and stance literals as module-level type aliases for reuse across schemas. Place these in `chunk.py` since that is where they originate, and re-export from `__init__.py`.

```python
Facet = Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
Stance = Literal["positive", "negative", "mixed", "rumor", "review"]
EntityType = Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
RelationshipType = Literal["MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"]
```

### `apps/api/schemas/chunk.py`

Models for the extraction pipeline output consumed by WS1.

**`ExtractedEntity`** fields:
- `id: str` -- unique entity identifier
- `title: str`
- `type: EntityType` (Literal of 6 values)
- `description: str`

**`ExtractedRelationship`** fields:
- `source: str` -- entity ID
- `target: str` -- entity ID
- `type: RelationshipType` (Literal of 5 values)
- `description: str`
- `weight: float`

**`ChunkExtraction`** fields:
- `entities: list[ExtractedEntity]`
- `relationships: list[ExtractedRelationship]`
- `claims: list[str]`
- `facet: Facet`
- `stance: Stance`
- `segment_hints: list[str]`
- `novelty_signals: list[str]`
- `evidence_score: float` -- 0-1
- `rumor_confidence: float` -- 0-1
- `direct_quote_candidates: list[str]`

### `apps/api/schemas/persona.py`

**`SkepticismProfile`** fields:
- `trust_in_reviews: float` -- 0-1
- `trust_in_brand_claims: float` -- 0-1
- `influencer_susceptibility: float` -- 0-1

**`Belief`** fields:
- `claim: str`
- `stance: str`
- `evidence_chunk_ids: list[str]` -- minimum 2 required at the synthesis layer, but schema allows empty (filtering is a business rule in `synthesize.py`)

**`Persona`** fields:
- `segment_label: str`
- `summary: str`
- `jobs_to_be_done: list[str]`
- `feature_priorities: dict[str, float]` -- keys should be valid facet names (validated at synthesis, not schema)
- `beliefs: list[Belief]`
- `skepticism_profile: SkepticismProfile`
- `graph_entity_ids: list[str]`

### `apps/api/schemas/scenario.py`

**`Scenario`** fields:
- `product_name: str`
- `description: str`
- `hypotheses: list[str]`
- `facets_to_explore: list[str]`

**Pydantic validators** (use `@field_validator` with `mode="before"` or `mode="after"` as appropriate):

1. `product_name`: must be non-empty after stripping whitespace, max 200 characters. Raise `ValueError` on violation.
2. `hypotheses`: list length must be 1-10 inclusive. Each item must be max 500 characters. Raise `ValueError` on violation.
3. `facets_to_explore`: each item must be one of the valid `Facet` literal values (`"camera"`, `"battery"`, `"price"`, `"design"`, `"privacy"`, `"ecosystem"`, `"other"`). Raise `ValueError` on invalid facet.

### `apps/api/schemas/simulation.py`

**`PersonaResponse`** fields:
- `persona_id: str`
- `overall_reaction: str`
- `adoption_likelihood_0_100: int` -- 0 to 100
- `strongest_positive: str`
- `strongest_concern: str`
- `feature_scores: dict[str, float]`
- `what_would_change_my_mind: str`
- `quotable_sentence: str`
- `cited_chunk_ids: list[str]`

**`ModeratorQuestion`** fields:
- `disagreement_summary: str`
- `follow_up_question: str`
- `targeted_persona_ids: list[str]`

**`AnalystSummary`** fields:
- `consensus_themes: list[str]`
- `disagreement_themes: list[str]`
- `top_risks: list[str]`
- `top_wins: list[str]`
- `feature_recommendations: list[str]`
- `messaging_suggestions: list[str]`
- `evidence_gaps: list[str]`

### `apps/api/schemas/dashboard.py`

**`ScoredLabel`** fields:
- `label: str`
- `score: float`

**`FeatureScoreRow`** fields:
- `mean: float`
- `min: float`
- `max: float`
- `std: float`
- `persona_scores: dict[str, float]` -- keyed by persona_id

**`QuoteCard`** fields:
- `persona_id: str`
- `segment_label: str`
- `quote: str`
- `facet: str`
- `sentiment: str`

**`TribeResult`** fields:
- `enabled: bool`
- `response_strength: float`
- `response_variance: float`
- `response_spread: float`
- `scored_text: str`

**`PersonaSummary`** fields:
- `persona_id: str`
- `segment_label: str`
- `summary: str`
- `adoption_likelihood: int` -- 0-100
- `strongest_positive: str`
- `strongest_concern: str`
- `feature_priorities: dict[str, float]`

**`DashboardPayload`** fields:
- `project_id: str`
- `scenario_id: str`
- `consensus_score: float` -- 0-1
- `disagreement_score: float` -- 0-1
- `evidence_coverage: float` -- 0-1
- `top_risks: list[ScoredLabel]`
- `top_wins: list[ScoredLabel]`
- `feature_scores: dict[str, FeatureScoreRow]`
- `personas: list[PersonaSummary]`
- `quotes: list[QuoteCard]`
- `round1_responses: list[PersonaResponse]`
- `round2_responses: list[PersonaResponse]`
- `moderator_question: str`
- `analyst_summary: AnalystSummary`
- `tribe: TribeResult | None` -- None when TRIBE is disabled

### `apps/api/schemas/project.py`

**`Project`** fields:
- `project_id: str`
- `name: str`
- `status: str`
- `created_at: str` -- ISO 8601 datetime string
- `source_count: int`
- `chunk_count: int`
- `dashboard: DashboardPayload | None` -- None until simulation has run

### `apps/api/schemas/__init__.py`

Re-export all public models and type aliases from this package so consumers can do:

```python
from apps.api.schemas import ChunkExtraction, Persona, Scenario, DashboardPayload
```

Export the following names:
- From `chunk`: `Facet`, `Stance`, `EntityType`, `RelationshipType`, `ExtractedEntity`, `ExtractedRelationship`, `ChunkExtraction`
- From `persona`: `SkepticismProfile`, `Belief`, `Persona`
- From `scenario`: `Scenario`
- From `simulation`: `PersonaResponse`, `ModeratorQuestion`, `AnalystSummary`
- From `dashboard`: `ScoredLabel`, `FeatureScoreRow`, `QuoteCard`, `TribeResult`, `PersonaSummary`, `DashboardPayload`
- From `project`: `Project`

---

## Implementation Notes

1. **All models inherit from `pydantic.BaseModel`.** No custom `model_config` is needed unless you want `frozen=True` for immutability (recommended for data transfer objects, but not required by downstream code).

2. **Literal types, not Enum.** This is critical for Gemini compatibility. Gemini's structured output expects plain JSON string values matching the literal options, not enum member names.

3. **Validators go on `Scenario` only.** The other models are pure data containers. Business-rule validation (e.g., "beliefs need 2+ evidence chunks") happens at the synthesis layer (section-05), not in the schema itself.

4. **JSON Schema export compatibility.** Every model must successfully produce a JSON Schema via `.model_json_schema()`. This is used as the `response_schema` parameter in Gemini API calls. Test this explicitly to catch issues early (nested generics, complex unions, etc.).

5. **Float ranges are not enforced at the schema level.** Values described as "0-1" are documented conventions. The producing code (Gemini output, heuristic calculations) is responsible for clamping. If you want belt-and-suspenders, you can add `Field(ge=0, le=1)` annotations, but this risks Gemini output being rejected on minor floating-point overflows.

6. **No database ORM integration.** This is an in-memory system. Schemas are pure Pydantic models used for serialization, validation, and API contracts.

---

## Verification Checklist

After implementation, confirm:

- [ ] All tests in `tests/schemas/` pass with `uv run pytest tests/schemas/`
- [ ] Every model roundtrips through `model_dump()` / `model_validate()`
- [ ] Invalid literals raise `ValidationError`
- [ ] Scenario validators reject the four invalid cases (empty name, >200 char name, >10 hypotheses, >500 char hypothesis, invalid facet)
- [ ] `DashboardPayload` works with `tribe=None`
- [ ] Every model exports a valid JSON Schema via `model_json_schema()`
- [ ] `__init__.py` re-exports all public names