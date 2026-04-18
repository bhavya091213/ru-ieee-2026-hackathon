Now I have all the context I need. Let me generate the section content.

# Section 9: Moderator and Analyst

## Overview

This section implements two critical single-Gemini-call phases in the simulation pipeline: the **moderator** (phase 3) and the **analyst** (phase 5). The moderator analyzes round 1 persona responses to identify the sharpest disagreement and generates a targeted follow-up question. The analyst synthesizes both rounds of responses plus the moderator question into actionable product insights (consensus themes, disagreement themes, risks, wins, recommendations).

Both modules live under `core/simulation/` and depend on the `generate_structured()` Gemini wrapper, the Pydantic schemas for `ModeratorQuestion` and `AnalystSummary`, and the prompt templates stored in `core/simulation/prompts.py`.

## Dependencies

- **Section 01 (Schemas)**: `ModeratorQuestion`, `AnalystSummary`, and `PersonaResponse` Pydantic models must exist in `apps/api/schemas/simulation.py`.
- **Section 02 (Gemini Client)**: The `generate_structured()` function in `core/gemini.py` must be available with prompt-hash caching, retry logic, and Pydantic validation.
- **Section 06 (Orchestrator State)**: `SimulationState` frozen dataclass and `SimPhase` enum must exist. The orchestrator calls the moderator and analyst as phase functions.
- **Section 08 (Simulation Rounds)**: Round 1 and round 2 implementations must produce `list[PersonaResponse]`. The moderator consumes round 1 output; the analyst consumes both rounds.

## Files to Create

| File | Purpose |
|------|---------|
| `core/simulation/moderator.py` | `analyze_disagreement()` function |
| `core/simulation/analyst.py` | `synthesize_results()` function |
| `tests/test_moderator.py` | Tests for moderator |
| `tests/test_analyst.py` | Tests for analyst |

## Files to Modify

| File | Change |
|------|--------|
| `core/simulation/prompts.py` | Add `MODERATOR_PROMPT` and `ANALYST_PROMPT` constants |
| `core/simulation/orchestrator.py` | Wire moderator and analyst phases into the state machine loop |

---

## Tests (Write First)

### `tests/test_moderator.py`

```python
"""Tests for the moderator phase — analyze_disagreement().

All tests mock the Gemini client via generate_structured to avoid real API calls.
"""

# Test: analyze_disagreement returns ModeratorQuestion (mock Gemini)
#   - Provide 3-4 mock PersonaResponse objects with varying adoption_likelihood
#     and opposing strongest_positive / strongest_concern values.
#   - Mock generate_structured to return a valid ModeratorQuestion.
#   - Assert result is an instance of ModeratorQuestion.

# Test: moderator identifies at least one targeted_persona_id
#   - Mock generate_structured returning a ModeratorQuestion with targeted_persona_ids
#     containing at least one ID.
#   - Assert len(result.targeted_persona_ids) >= 1.

# Test: targeted_persona_ids exist in the persona set
#   - Provide PersonaResponses with known persona_ids ("p1", "p2", "p3").
#   - Mock generate_structured returning targeted_persona_ids = ["p1", "p3"].
#   - Assert every ID in result.targeted_persona_ids is in the input persona set.
#   - If the function performs post-validation filtering, test that unknown IDs
#     are stripped. If not, this is a schema-level guarantee from Gemini output.

# Test: follow_up_question is non-empty
#   - Mock generate_structured with a valid ModeratorQuestion.
#   - Assert len(result.follow_up_question.strip()) > 0.

# Test: disagreement_summary references specific persona disagreements
#   - Mock generate_structured with a ModeratorQuestion whose disagreement_summary
#     contains text referencing the mock persona IDs or segment labels.
#   - Assert the disagreement_summary is a non-empty string.
#   - (Exact content matching is not required since the LLM generates it;
#     the test verifies the field is populated and non-trivial.)
```

### `tests/test_analyst.py`

```python
"""Tests for the analyst phase — synthesize_results().

All tests mock the Gemini client via generate_structured to avoid real API calls.
"""

# Test: synthesize_results returns AnalystSummary (mock Gemini)
#   - Provide mock round1 and round2 PersonaResponse lists and a ModeratorQuestion.
#   - Mock generate_structured to return a valid AnalystSummary.
#   - Assert result is an instance of AnalystSummary.

# Test: analyst produces consensus_themes and disagreement_themes
#   - Mock generate_structured returning an AnalystSummary with non-empty
#     consensus_themes and disagreement_themes lists.
#   - Assert len(result.consensus_themes) > 0 and len(result.disagreement_themes) > 0.

# Test: analyst produces non-empty top_risks and top_wins
#   - Mock AnalystSummary with populated top_risks and top_wins.
#   - Assert both lists are non-empty.

# Test: analyst produces feature_recommendations
#   - Mock AnalystSummary with a populated feature_recommendations list.
#   - Assert len(result.feature_recommendations) > 0.
```

---

## Implementation Details

### Moderator: `core/simulation/moderator.py`

This module contains a single public async function. It makes one Gemini call using the moderator prompt template and returns a `ModeratorQuestion`.

```python
async def analyze_disagreement(
    round1_responses: list[PersonaResponse],
    chunk_summaries: list[str],
) -> ModeratorQuestion:
    """Identify the sharpest disagreement and generate a targeted follow-up question.

    Args:
        round1_responses: All persona responses from round 1.
        chunk_summaries: Brief text summaries of the evidence chunks
            available to the panel, for context in the prompt.

    Returns:
        ModeratorQuestion with disagreement_summary, follow_up_question,
        and targeted_persona_ids.

    Raises:
        ValueError: If generate_structured fails after retries.
    """
```

**Behavior:**

1. Serialize `round1_responses` to JSON for inclusion in the prompt. Each response includes `persona_id`, `adoption_likelihood_0_100`, `strongest_positive`, `strongest_concern`, and `feature_scores`.
2. Format the `MODERATOR_PROMPT` template with the serialized responses and chunk summaries.
3. Call `generate_structured(prompt, ModeratorQuestion)` with default temperature (0.0) and thinking enabled (this is a reasoning-heavy task).
4. Optionally validate that `targeted_persona_ids` reference persona IDs present in `round1_responses`. If any ID is invalid, log a warning and strip it. If the list becomes empty after filtering, log an error but still return the result (the follow-up question is still useful even without targeting).
5. Return the validated `ModeratorQuestion`.

**Prompt design (MODERATOR_PROMPT in `core/simulation/prompts.py`):**

The moderator prompt instructs Gemini to:
- Compare `adoption_likelihood` spread across personas (identify the highest and lowest)
- Identify opposing `strongest_positive` vs `strongest_concern` pairs across personas
- Find `feature_scores` divergences (facets where personas disagree most)
- Generate ONE specific follow-up question that forces disagreeing personas to confront each other's evidence
- Return the IDs of the 1-3 personas most involved in the disagreement

Template structure:
```
System: You are a skilled focus group moderator. Identify the sharpest disagreement
across persona responses and generate ONE targeted follow-up question that forces
the disagreeing personas to confront each other's evidence.

User:
Round 1 responses: {round1_responses_json}
Available evidence: {chunk_summaries}

Return: disagreement_summary, follow_up_question, targeted_persona_ids.
```

### Analyst: `core/simulation/analyst.py`

This module contains a single public async function. It makes one Gemini call using the analyst prompt template and returns an `AnalystSummary`.

```python
async def synthesize_results(
    round1: list[PersonaResponse],
    round2: list[PersonaResponse],
    moderator_question: ModeratorQuestion,
) -> AnalystSummary:
    """Produce actionable insights from the full panel discussion.

    Args:
        round1: All persona responses from round 1.
        round2: All persona responses from round 2 (after moderator intervention).
        moderator_question: The moderator's disagreement analysis and follow-up.

    Returns:
        AnalystSummary with consensus_themes, disagreement_themes, top_risks,
        top_wins, feature_recommendations, messaging_suggestions, evidence_gaps.

    Raises:
        ValueError: If generate_structured fails after retries.
    """
```

**Behavior:**

1. Serialize `round1`, `round2`, and `moderator_question` to JSON for prompt inclusion.
2. Format the `ANALYST_PROMPT` template with the serialized data.
3. Call `generate_structured(prompt, AnalystSummary)` with default temperature (0.0) and thinking enabled.
4. Return the validated `AnalystSummary`.

**Prompt design (ANALYST_PROMPT in `core/simulation/prompts.py`):**

The analyst prompt instructs Gemini to:
- Identify themes where more than 70% of personas agree (consensus)
- Identify themes with high `adoption_likelihood` variance across rounds (disagreement)
- Rank risks by severity: how many personas flagged them, how strong the concern
- Rank wins by strength: adoption boost, evidence quality
- Provide actionable feature recommendations tied to specific facets
- Suggest messaging angles based on persona language (what words and frames resonate)
- Flag evidence gaps: topics discussed but poorly supported by data

Template structure:
```
System: You are a senior product research analyst. Synthesize panel results into
actionable insights. Reference only persona outputs and retrieved evidence.

User:
Round 1: {round1_json}
Round 2: {round2_json}
Moderator question: {moderator_question_json}

Return: consensus_themes, disagreement_themes, top_risks, top_wins,
feature_recommendations, messaging_suggestions, evidence_gaps.
```

### Prompt Constants: `core/simulation/prompts.py`

Add two new string constants to the existing prompts file:

- `MODERATOR_PROMPT`: A multi-line string template with `{round1_responses_json}` and `{chunk_summaries}` placeholders. Contains both the system instruction and user message sections.
- `ANALYST_PROMPT`: A multi-line string template with `{round1_json}`, `{round2_json}`, and `{moderator_question_json}` placeholders. Contains both the system instruction and user message sections.

Both prompts must include the standard grounding instruction: "Never invent facts. Every claim must map to evidence chunk IDs. Return valid JSON matching the provided schema only."

### Orchestrator Integration: `core/simulation/orchestrator.py`

Wire the moderator and analyst into the simulation state machine's phase loop. The orchestrator's `run_simulation()` function calls phases sequentially. After section 08 implements ROUND1 and ROUND2, the moderator and analyst slots in as:

- **Phase 3 (MODERATING)**: Call `analyze_disagreement(state.round1_responses, chunk_summaries)` where `chunk_summaries` is derived from `state.retrieved_evidence`. Store result in `state.moderator_question` via `transition()`.
- **Phase 5 (ANALYZING)**: Call `synthesize_results(state.round1_responses, state.round2_responses, state.moderator_question)`. Store result in `state.analyst_summary` via `transition()`.

Both phases have the standard 180-second timeout via `asyncio.timeout()`. On failure, the orchestrator sets `phase=FAILED` and short-circuits.

---

## Schema Reference

For implementer convenience, here are the schemas this section depends on (defined in section 01):

**`ModeratorQuestion`** (in `apps/api/schemas/simulation.py`):
- `disagreement_summary: str` -- text describing the key disagreement
- `follow_up_question: str` -- the targeted question for round 2
- `targeted_persona_ids: list[str]` -- IDs of personas to target

**`AnalystSummary`** (in `apps/api/schemas/simulation.py`):
- `consensus_themes: list[str]`
- `disagreement_themes: list[str]`
- `top_risks: list[str]`
- `top_wins: list[str]`
- `feature_recommendations: list[str]`
- `messaging_suggestions: list[str]`
- `evidence_gaps: list[str]`

**`PersonaResponse`** (in `apps/api/schemas/simulation.py`):
- `persona_id: str`
- `overall_reaction: str`
- `adoption_likelihood_0_100: int`
- `strongest_positive: str`
- `strongest_concern: str`
- `feature_scores: dict[str, float]`
- `what_would_change_my_mind: str`
- `quotable_sentence: str`
- `cited_chunk_ids: list[str]`

---

## Key Design Decisions

1. **Single Gemini call each**: Both the moderator and analyst are single LLM calls, not multi-step chains. This keeps latency low (the simulation has only two sequential Gemini calls: moderator then analyst; everything else is parallel fan-out).

2. **Thinking enabled**: Both calls use Gemini's thinking mode because they require complex reasoning across multiple persona responses. No explicit `thinking_budget` parameter is set (use the default).

3. **Temperature 0.0**: Both calls use temperature 0.0 for deterministic, grounded output. The analyst and moderator should not hallucinate or add creative embellishment.

4. **Post-validation of targeted_persona_ids**: The moderator function should validate that returned persona IDs actually exist in the input set. Invalid IDs are logged and stripped. This is a defensive measure against Gemini returning fabricated IDs.

5. **No partial results**: If either call fails after retries, it raises `ValueError`. The orchestrator catches this and marks the simulation as `FAILED`. There is no fallback or degraded mode.

6. **Prompt serialization**: PersonaResponse objects are serialized to JSON via `.model_dump_json()` for inclusion in prompts. This ensures the LLM sees the exact schema fields.