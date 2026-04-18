# Code Review: Section 01 - Pydantic Schemas

**Reviewer:** code-reviewer agent  
**Date:** 2026-04-18  
**Scope:** apps/api/schemas/ and tests/schemas/  

---

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 2     | warn   |
| MEDIUM   | 3     | info   |
| LOW      | 0     | note   |

**Verdict:** WARNING — 2 HIGH issues should be resolved before merge.

---

## HIGH Priority Issues

### [HIGH] Missing range validation on float fields
**Files:** apps/api/schemas/chunk.py:42-43, apps/api/schemas/persona.py:6-9, apps/api/schemas/dashboard.py:50-51

**Issue:** Float fields documented as 0-1 ranges have no validation constraints. While the spec states "Float ranges are not enforced at schema level," this creates a silent failure mode where invalid data (negative values, values >1) can propagate through the system undetected.

**Impact:** 
- Invalid float values (e.g., `evidence_score=-0.5`, `trust_in_reviews=1.5`) pass validation
- Downstream consumers may receive corrupted data
- Frontend visualizations could render incorrectly
- No early warning when Gemini produces out-of-range values

**Recommendation:** Add Pydantic Field validators with `ge=0, le=1` constraints for float fields that have documented ranges:

```python
from pydantic import BaseModel, Field

class ChunkExtraction(BaseModel):
    evidence_score: float = Field(ge=0, le=1)
    rumor_confidence: float = Field(ge=0, le=1)
    # ... other fields

class SkepticismProfile(BaseModel):
    trust_in_reviews: float = Field(ge=0, le=1)
    trust_in_brand_claims: float = Field(ge=0, le=1)
    influencer_susceptibility: float = Field(ge=0, le=1)

class DashboardPayload(BaseModel):
    consensus_score: float = Field(ge=0, le=1)
    disagreement_score: float = Field(ge=0, le=1)
    evidence_coverage: float = Field(ge=0, le=1)
    # ... other fields
```

This catches data quality issues at the boundary rather than propagating invalid data.

**Affected fields:**
- `ChunkExtraction`: evidence_score, rumor_confidence
- `SkepticismProfile`: trust_in_reviews, trust_in_brand_claims, influencer_susceptibility
- `DashboardPayload`: consensus_score, disagreement_score, evidence_coverage
- `ExtractedRelationship`: weight (if this is also 0-1)
- `FeatureScoreRow`: mean, min, max, std (some may need different ranges)

---

### [HIGH] Missing range validation on integer fields
**Files:** apps/api/schemas/simulation.py:9, apps/api/schemas/dashboard.py:41

**Issue:** Integer fields `adoption_likelihood_0_100` and `adoption_likelihood` claim to be 0-100 but have no enforcement.

**Recommendation:**

```python
class PersonaResponse(BaseModel):
    adoption_likelihood_0_100: int = Field(ge=0, le=100)
    # ... other fields

class PersonaSummary(BaseModel):
    adoption_likelihood: int = Field(ge=0, le=100)
    # ... other fields
```

---

## MEDIUM Priority Issues

### [MEDIUM] Missing test coverage for ModeratorQuestion
**File:** tests/schemas/test_simulation.py

**Issue:** The test file only covers `PersonaResponse`. `ModeratorQuestion` has no roundtrip test.

**Recommendation:** Add test case:

```python
def test_moderator_question_roundtrip():
    original = ModeratorQuestion(
        disagreement_summary="Price sensitivity varies widely",
        follow_up_question="What price point would change your mind?",
        targeted_persona_ids=["persona-1", "persona-2"]
    )
    data = original.model_dump()
    restored = ModeratorQuestion.model_validate(data)
    assert restored == original
```

---

### [MEDIUM] Missing test coverage for AnalystSummary standalone
**File:** tests/schemas/test_dashboard.py

**Issue:** `AnalystSummary` is only tested as a nested field in `DashboardPayload`. It deserves its own roundtrip test since it's a complex model with 7 list fields.

**Recommendation:** Add to test_dashboard.py:

```python
class TestAnalystSummary:
    def test_roundtrip(self):
        original = _make_analyst_summary()
        data = original.model_dump()
        restored = AnalystSummary.model_validate(data)
        assert restored == original
```

---

### [MEDIUM] Missing test coverage for TribeResult standalone
**File:** tests/schemas/test_dashboard.py

**Issue:** `TribeResult` is only tested as a nested field in `DashboardPayload`. Should have standalone roundtrip test.

**Recommendation:** Add:

```python
class TestTribeResult:
    def test_roundtrip(self):
        original = TribeResult(
            enabled=True,
            response_strength=0.8,
            response_variance=0.3,
            response_spread=0.6,
            scored_text="Strong tribal response"
        )
        data = original.model_dump()
        restored = TribeResult.model_validate(data)
        assert restored == original
```

---

## Positive Observations

1. **Excellent test structure** — Factory functions (`_make_*`) provide clean, reusable test fixtures
2. **Correct Pydantic v2 usage** — `model_dump()` and `model_validate()` are used consistently
3. **Literal types over Enum** — Correct design decision for Gemini compatibility
4. **Comprehensive JSON Schema export test** — The parametrized test in `test_json_schema_export.py` is excellent
5. **Scenario validators are correct** — All edge cases are tested (empty string, whitespace, length limits, invalid facets)
6. **`__init__.py` exports** — Clean re-export pattern with explicit `__all__`
7. **Type annotations** — All fields have proper type hints, including union types with `|` syntax
8. **Forward references** — Proper use of `from __future__ import annotations` for cleaner type hints

---

## Code Quality Notes

### Good Practices
- **Immutable by default**: Models don't mutate, which is correct for DTOs
- **Simple schema design**: No over-engineering, just clean data containers
- **Clear naming**: Field names are descriptive and consistent
- **Test organization**: One test file per schema module

### Minor Observations (Not Issues)
- `Belief.stance` is `str` instead of typed Stance literal — this is intentional per spec (beliefs can have freeform stances beyond positive/negative/mixed)
- `QuoteCard.facet` and `QuoteCard.sentiment` are `str` instead of Literal types — consider typing if these should be constrained
- `Project.status` is `str` — if there's a fixed set of statuses, consider a Literal type
- `Project.created_at` is `str` — consider using `datetime` with JSON serialization or explicitly document the ISO 8601 format

---

## Test Coverage Assessment

**Estimated coverage:** ~85% (good, but missing some edge cases)

**Covered:**
- All models roundtrip through serialization
- Invalid Literal type rejection
- Scenario validators (all 6 edge cases)
- Optional/None handling (tribe, dashboard, evidence_chunk_ids)
- JSON Schema export for all models

**Missing coverage:**
- ModeratorQuestion roundtrip
- AnalystSummary standalone roundtrip
- TribeResult standalone roundtrip
- PersonaSummary standalone roundtrip (only tested nested in DashboardPayload)
- Project with populated dashboard field
- Edge case: empty lists (entities, relationships, claims, hypotheses, etc.)
- Edge case: very large dictionaries (feature_scores, persona_scores)

**Recommendation:** Add the 3 MEDIUM priority tests above to achieve 90%+ coverage.

---

## Security Review

- **No hardcoded secrets** ✓
- **No SQL injection risks** ✓ (no database layer)
- **No XSS risks** ✓ (backend schemas only)
- **No input sanitization needed** ✓ (Pydantic handles this)

---

## Performance Considerations

- All models are lightweight data classes — no performance concerns
- JSON Schema export is cached by Pydantic — no performance impact
- Validators on Scenario are simple O(n) list iterations — acceptable

---

## Gemini Compatibility

**All schemas compatible with Gemini structured output** ✓

Confirmed:
- Uses Literal types (not Enum)
- All fields are JSON-serializable primitives or containers
- No complex unions that would confuse Gemini
- JSON Schema export succeeds for all models
- No circular dependencies

---

## Dependency Graph

Verified dependency order:
- chunk.py → (no dependencies)
- persona.py → (no dependencies)
- scenario.py → chunk.py (imports VALID_FACETS)
- simulation.py → (no dependencies)
- dashboard.py → simulation.py (imports AnalystSummary, PersonaResponse)
- project.py → dashboard.py (imports DashboardPayload)

**No circular dependencies** ✓

---

## Actionable Recommendations

### Must Fix (HIGH)
1. Add Field validators for float ranges (0-1)
2. Add Field validators for integer ranges (0-100)

### Should Fix (MEDIUM)
3. Add test for ModeratorQuestion roundtrip
4. Add test for AnalystSummary standalone
5. Add test for TribeResult standalone

### Consider (LOW)
6. Document ISO 8601 format for Project.created_at
7. Consider Literal types for Project.status if statuses are fixed
8. Consider edge case tests (empty lists, large dicts)

---

## Conclusion

The implementation is **well-structured and production-ready** with two caveats:

1. **HIGH priority:** Add range validation to float/int fields to prevent invalid data propagation
2. **MEDIUM priority:** Add 3 missing test cases for complete coverage

The code follows Pydantic v2 best practices, has excellent test structure, and correctly implements the Gemini-compatible design. The schema design is clean, maintainable, and sets a solid foundation for the rest of the system.

Once the range validation is added, this section can be merged with confidence.
