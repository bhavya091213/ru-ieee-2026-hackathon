Now I have all the context I need. Let me generate the section content for section-08-simulation-rounds.

# Section 08: Simulation Rounds (Round 1 and Round 2)

## Overview

This section implements the two persona response phases of the simulation pipeline: **Round 1** (initial reactions) and **Round 2** (revised positions after hearing other panelists and the moderator's follow-up). These are the core fan-out phases where each persona independently generates a response to the product scenario via parallel Gemini calls.

Both rounds share the same structural pattern -- parallel fan-out via `asyncio.TaskGroup` with `asyncio.Semaphore(5)` for rate limiting -- but differ in their prompt context. Round 1 starts with only the persona's own evidence and the scenario. Round 2 includes all Round 1 responses, the moderator's follow-up question, and an explicit instruction to revise positions based on new information.

This section also implements the **evidence grounding validation** logic that runs after each round, stripping invalid `cited_chunk_ids` and flagging low-grounding responses.

## Dependencies

- **section-01-schemas**: Provides `Persona`, `Scenario`, `PersonaResponse` (the output model for each persona's response), `ModeratorQuestion` (used as input context for Round 2). All live in `apps/api/schemas/`.
- **section-02-gemini-client**: Provides `generate_structured()` from `core/gemini.py`, which is the only way to call Gemini. Every persona response call goes through this wrapper.
- **section-06-orchestrator-state**: Provides `SimulationState` (frozen dataclass) and `SimPhase` (StrEnum). The Round 1 and Round 2 phase functions accept a `SimulationState` and return a new one via `state.transition()`.
- **section-07-retrieval-mock**: Provides `RetrievalResult` from `schemas/retrieval.py` and the `retrieve_for_persona()` function. The RETRIEVING phase (also implemented here) calls `retrieve_for_persona()` for each persona in parallel. The retrieved evidence is stored in `state.retrieved_evidence` and consumed by both rounds.

## Files to Create

| File | Purpose |
|------|---------|
| `core/simulation/rounds.py` | `retrieve_phase()`, `round1_phase()`, `round2_phase()` phase functions, plus the shared `_fan_out_persona_calls()` helper and grounding validation |
| `core/simulation/prompts.py` | `PANEL_RESPONSE_PROMPT` template (shared by both rounds, with round-specific context injection). This file will be extended by section-09 with `MODERATOR_PROMPT` and `ANALYST_PROMPT`. |
| `tests/test_simulation_rounds.py` | All tests for retrieval phase, round 1, round 2, grounding validation |

All file paths are relative to the project root at `/Users/bhavyapatel/Documents/Projects/focus-group-agent`.

## Background and Context

### The Simulation Pipeline

PanelForge's simulation runs as a six-phase sequential pipeline (managed by the orchestrator from section-06):

1. **RETRIEVING** -- fetch evidence per persona (parallel)
2. **ROUND1** -- fan-out persona responses (parallel Gemini calls)
3. **MODERATING** -- moderator disagreement analysis (single Gemini call, section-09)
4. **ROUND2** -- persona revisions with discussion context (parallel Gemini calls)
5. **ANALYZING** -- analyst synthesis (single Gemini call, section-09)
6. **SCORING** -- optional TRIBE heuristic scoring (section-12)

This section implements phases 1, 2, and 4. Each phase function has the signature `async def phase_name(state: SimulationState) -> SimulationState` and returns a new state via `state.transition()`.

### Evidence Grounding Philosophy

The project's primary success metric is evidence grounding -- every persona claim must trace back to real source data. The prompt engineering, grounding validation, and metadata tracking in this section all serve that goal. Invalid citations are stripped, but personas are never dropped (the moderator and analyst need all voices).

### Concurrency Pattern

Both rounds use `asyncio.TaskGroup` for parallel execution with automatic fail-fast semantics: if any persona's Gemini call fails, all remaining tasks are cancelled and the phase transitions to FAILED. An `asyncio.Semaphore(5)` limits concurrent Gemini calls to prevent rate limiting from the API.

---

## Tests (Write First)

All tests go in `tests/test_simulation_rounds.py`. Use `pytest` with `pytest-asyncio`. All Gemini calls must be mocked -- no real API calls.

```python
# tests/test_simulation_rounds.py

"""Tests for simulation round 1, round 2, and retrieval phase implementations."""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

# --- Retrieval Phase Tests ---

# Test: retrieve_phase calls retrieve_for_persona for each persona in parallel
# Create a SimulationState with 3 personas and a scenario.
# Mock retrieve_for_persona to return a list of RetrievalResult objects.
# Run retrieve_phase(state). Assert retrieve_for_persona was called 3 times
# (once per persona). Assert the returned state has retrieved_evidence populated
# with a key per persona (using persona segment_label or persona_id as key).

# Test: retrieve_phase stores results in state.retrieved_evidence keyed by persona identifier
# After running retrieve_phase, assert state.retrieved_evidence is a dict
# with one entry per persona. Each value should be a non-empty list of RetrievalResult.

# Test: retrieve_phase transitions to FAILED if any retrieval call raises
# Mock retrieve_for_persona to raise an exception for the second persona.
# Assert the returned state has phase=FAILED and an error message.

# --- Round 1 Tests ---

# Test: fan_out_round1 calls Gemini for each persona in parallel (mock)
# Create a state with 3 personas and retrieved_evidence populated.
# Mock generate_structured to return a valid PersonaResponse.
# Run round1_phase(state). Assert generate_structured was called 3 times.

# Test: fan_out_round1 uses TaskGroup for fail-fast
# Mock generate_structured to succeed for persona 1 but raise ValueError
# for persona 2. Assert the entire phase fails (state.phase == FAILED)
# without waiting for persona 3.

# Test: fan_out_round1 fails entire phase if any persona call fails
# Mock generate_structured to raise for one persona.
# Assert returned state has phase=FAILED.

# Test: fan_out_round1 uses temperature=0.2
# Mock generate_structured and capture the temperature argument.
# Assert temperature=0.2 was passed.

# Test: round1 responses include cited_chunk_ids
# Mock generate_structured to return PersonaResponse with cited_chunk_ids.
# Assert the returned state's round1_responses each have cited_chunk_ids.

# Test: grounding validation strips invalid cited_chunk_ids
# Create a PersonaResponse with cited_chunk_ids = ["valid-1", "invalid-999"].
# Provide retrieved_evidence that only contains "valid-1".
# Run grounding validation. Assert the cleaned response only has ["valid-1"].

# Test: grounding validation flags response as low_grounding when zero valid citations
# Create a PersonaResponse with cited_chunk_ids = ["nonexistent-1", "nonexistent-2"].
# Run grounding validation. Assert cited_chunk_ids is now empty.
# Assert the metadata flags this persona as low_grounding.

# Test: grounding validation does NOT drop persona with zero citations
# After grounding validation flags a persona as low_grounding,
# assert the persona's response still exists in the round1_responses list.
# The persona is NOT removed -- only flagged.

# --- Round 2 Tests ---

# Test: fan_out_round2 includes round1 responses and moderator question in context
# Create a state with round1_responses and moderator_question populated.
# Mock generate_structured and capture the prompt argument.
# Run round2_phase(state). Assert the prompt contains text from
# round1 responses (e.g., a persona's overall_reaction) and the
# moderator's follow_up_question.

# Test: round2 prompt includes "update your position if evidence warrants it"
# Mock generate_structured and capture the prompt argument.
# Run round2_phase(state). Assert the prompt string contains
# the phrase about updating position based on evidence.

# Test: round2_phase returns state with round2_responses populated
# Mock generate_structured to return valid PersonaResponse objects.
# Run round2_phase(state). Assert state.round2_responses has one
# entry per persona.

# Test: round2 grounding validation runs on round2 responses
# Provide round2 responses with some invalid cited_chunk_ids.
# Assert grounding validation strips them just like round1.

# --- Semaphore Rate Limiting ---

# Test: concurrent Gemini calls are limited by semaphore
# Create a state with 10 personas. Use a mock generate_structured
# that tracks concurrent execution count (via asyncio). Assert
# that no more than 5 calls are ever in-flight simultaneously.
```

---

## Implementation Details

### 1. Prompt Template (`core/simulation/prompts.py`)

This file stores the panel response prompt used by both rounds. The moderator and analyst prompts (section-09) will be added to this file later.

**`PANEL_RESPONSE_PROMPT`** -- The system message and user message template for persona round responses.

The prompt has two parts:

**System message** (establishes role and constraints):
- "You are a consumer panelist participating in a focus group discussion."
- "You represent the {segment_label} segment with these characteristics: {persona_summary}"
- "Every claim you make MUST map to one or more evidence chunk IDs from the provided evidence."
- "Never invent facts. Only reference evidence that was provided to you."
- "Maintain your own perspective even if others disagree. Do not become a sycophant."
- "Return valid JSON matching the provided schema only."

**User message** (contains the data):
- Product scenario: `{product_name}`, `{description}`, `{hypotheses}`
- Persona details: `{persona_json}` (full serialized persona)
- Retrieved evidence: `{evidence_chunks}` (list of chunk_id + text pairs)
- Discussion context (Round 2 only): `{round1_summary}` (other panelists' reactions)
- Moderator question (Round 2 only): `{follow_up_question}`
- Round 2 revision instruction: "You have now heard other panelists' perspectives and a moderator follow-up question. Update your position if the evidence warrants it. Explain what changed and why."

The template uses Python string `.format()` with named placeholders. Round 1 leaves `{round1_summary}` and `{follow_up_question}` empty (or omits those sections entirely). Round 2 fills them in.

**Anti-sycophancy measures in the prompt:**
- Explicit instruction: "Maintain your own perspective even if others disagree."
- Anchoring instruction: "Your beliefs are rooted in evidence. Only change your position if you encounter new evidence that genuinely challenges your current view."
- Scoring reminder: "Your adoption_likelihood_0_100 should reflect YOUR segment's actual likelihood to adopt, not a consensus estimate."

### 2. Grounding Validation (`core/simulation/rounds.py`)

A utility function that validates and cleans `cited_chunk_ids` in persona responses:

```python
def validate_grounding(
    response: PersonaResponse,
    valid_chunk_ids: set[str],
) -> tuple[PersonaResponse, bool]:
    """Validate cited_chunk_ids against the set of retrieved evidence chunk IDs.

    Returns a new PersonaResponse with invalid IDs stripped, and a boolean
    flag indicating whether the response has low grounding (zero valid citations).

    The original PersonaResponse is NOT mutated. A new one is created with
    the cleaned cited_chunk_ids list.
    """
```

Key behaviors:
- Filter `response.cited_chunk_ids` to only include IDs present in `valid_chunk_ids`.
- Log a warning for each stripped invalid chunk ID (include the persona_id in the log).
- If the cleaned list is empty, set the `low_grounding` flag to `True`.
- Return a new `PersonaResponse` (via `.model_copy(update=...)`) with the cleaned `cited_chunk_ids`.
- Never drop the persona from the response list. Low-grounding personas are flagged in `state.metadata` but still participate in all subsequent phases.

### 3. Shared Fan-Out Helper (`core/simulation/rounds.py`)

Both rounds use the same concurrency pattern. Extract a shared helper to avoid duplication:

```python
async def _fan_out_persona_calls(
    personas: list[Persona],
    build_prompt: Callable[[Persona], str],
    retrieved_evidence: dict[str, list],
    semaphore: asyncio.Semaphore,
    temperature: float = 0.2,
) -> list[PersonaResponse]:
    """Execute parallel Gemini calls for a list of personas.

    Uses asyncio.TaskGroup for automatic fail-fast with cancellation.
    Uses the provided semaphore to limit concurrent calls.

    For each persona:
      1. Acquire the semaphore
      2. Call generate_structured with the built prompt and PersonaResponse schema
      3. Return the validated PersonaResponse

    If any call fails, TaskGroup cancels all remaining tasks and the
    exception propagates.
    """
```

The `build_prompt` callable is a function that takes a `Persona` and returns the fully-formatted prompt string. This allows Round 1 and Round 2 to use the same fan-out logic with different prompt builders.

### 4. Retrieval Phase (`core/simulation/rounds.py`)

```python
async def retrieve_phase(state: SimulationState) -> SimulationState:
    """Phase 1: Retrieve evidence for each persona in parallel.

    For each persona, call retrieve_for_persona() using asyncio.TaskGroup.
    Store results in state.retrieved_evidence keyed by persona segment_label.

    Uses asyncio.Semaphore(5) for rate limiting.
    Returns new state with retrieved_evidence populated and phase advanced.
    """
```

Implementation flow:
1. Create an `asyncio.Semaphore(5)`.
2. Open an `asyncio.TaskGroup`.
3. For each persona, create a task that acquires the semaphore, calls `retrieve_for_persona(persona, state.scenario, state.project_id)`, and stores the result.
4. After all tasks complete, build a dict mapping each persona's `segment_label` to its retrieval results.
5. Return `state.transition(retrieved_evidence=evidence_dict, phase=SimPhase.ROUND1)`.
6. If any task raises an exception, TaskGroup propagates it. Catch it and return `state.transition(phase=SimPhase.FAILED, error=str(e))`.

### 5. Round 1 Phase (`core/simulation/rounds.py`)

```python
async def round1_phase(state: SimulationState) -> SimulationState:
    """Phase 2: Fan-out Round 1 persona responses.

    Each persona generates an initial reaction to the scenario based on their
    beliefs and retrieved evidence. Uses temperature=0.2 for slight variety.
    Thinking is enabled for complex reasoning.

    After collecting responses, runs grounding validation on each.
    Returns new state with round1_responses populated and phase advanced.
    """
```

Implementation flow:
1. Build a prompt builder function for Round 1 that formats `PANEL_RESPONSE_PROMPT` with the persona's data, the scenario, and the retrieved evidence (from `state.retrieved_evidence`). The discussion context and moderator question sections are omitted or empty.
2. Call `_fan_out_persona_calls()` with `temperature=0.2` and the Round 1 prompt builder.
3. For each returned `PersonaResponse`, run `validate_grounding()` against the set of valid chunk IDs from the persona's retrieved evidence.
4. Collect grounding metadata: for any persona flagged as `low_grounding`, add their `persona_id` to `state.metadata["low_grounding_round1"]`.
5. Return `state.transition(round1_responses=cleaned_responses, phase=SimPhase.MODERATING, metadata=updated_metadata)`.
6. On exception, return `state.transition(phase=SimPhase.FAILED, error=str(e))`.

### 6. Round 2 Phase (`core/simulation/rounds.py`)

```python
async def round2_phase(state: SimulationState) -> SimulationState:
    """Phase 4: Fan-out Round 2 persona revisions.

    Each persona revises their position after seeing Round 1 responses from
    all panelists and the moderator's follow-up question. Uses temperature=0.2.

    The prompt includes:
      - All Round 1 responses (so personas can see what others said)
      - The moderator's follow_up_question
      - Instruction to update beliefs based on new evidence

    After collecting responses, runs grounding validation.
    Returns new state with round2_responses populated and phase advanced.
    """
```

Implementation flow:
1. Build a prompt builder function for Round 2 that formats `PANEL_RESPONSE_PROMPT` with:
   - The persona's data and retrieved evidence (same as Round 1).
   - A summary of all Round 1 responses: for each persona, include their `segment_label`, `overall_reaction`, `adoption_likelihood_0_100`, `strongest_positive`, and `strongest_concern`.
   - The moderator's `follow_up_question` from `state.moderator_question`.
   - The revision instruction: "You have now heard other panelists' perspectives and a moderator follow-up question. Update your position if the evidence warrants it. Explain what changed and why."
2. Call `_fan_out_persona_calls()` with `temperature=0.2` and the Round 2 prompt builder.
3. Run `validate_grounding()` on each response, same as Round 1.
4. Store low-grounding flags in `state.metadata["low_grounding_round2"]`.
5. Return `state.transition(round2_responses=cleaned_responses, phase=SimPhase.ANALYZING, metadata=updated_metadata)`.
6. On exception, return `state.transition(phase=SimPhase.FAILED, error=str(e))`.

### 7. Building the Valid Chunk ID Set

For grounding validation, the set of valid chunk IDs for a persona is extracted from their retrieved evidence:

```python
def _get_valid_chunk_ids(
    persona_label: str,
    retrieved_evidence: dict[str, list],
) -> set[str]:
    """Extract the set of valid chunk_ids from a persona's retrieved evidence.

    Returns a set of chunk_id strings that the persona is allowed to cite.
    """
```

This looks up `retrieved_evidence[persona_label]` and collects all `chunk_id` values from the `RetrievalResult` objects. If the persona has no retrieved evidence (should not happen in normal flow), returns an empty set and logs a warning.

### 8. How Phase Functions Integrate with the Orchestrator

These three phase functions are registered in the `phase_funcs` dict that the orchestrator's `run_simulation()` consumes:

```python
# In the simulation setup (routes/simulate.py or a wiring module):
from core.simulation.rounds import retrieve_phase, round1_phase, round2_phase
from core.simulation.orchestrator import SimPhase

phase_funcs = {
    SimPhase.RETRIEVING: retrieve_phase,
    SimPhase.ROUND1: round1_phase,
    # SimPhase.MODERATING: moderator_phase,   # section-09
    SimPhase.ROUND2: round2_phase,
    # SimPhase.ANALYZING: analyst_phase,       # section-09
    # SimPhase.SCORING: scoring_phase,         # section-12
}
```

Each function receives a `SimulationState` and returns a new `SimulationState`. The orchestrator handles timeout enforcement (180s per phase) and fail-fast short-circuiting. The phase functions themselves do not need to implement timeout logic.

---

## Prompt Design Details

### Round 1 Prompt Structure

The prompt sent to Gemini for each persona in Round 1 follows this structure:

1. **System role**: "You are a consumer panelist in a focus group. You represent the '{segment_label}' consumer segment."
2. **Persona profile**: Full persona JSON including beliefs, feature_priorities, skepticism_profile, jobs_to_be_done.
3. **Scenario**: Product name, description, hypotheses to evaluate.
4. **Evidence**: List of retrieved chunks formatted as `[chunk_id]: "text"` pairs. Only chunks from this persona's retrieval are included.
5. **Grounding instruction**: "Every claim must reference specific evidence chunk IDs from the list above. Include them in your cited_chunk_ids field."
6. **Anti-sycophancy instruction**: "Maintain your own perspective. Your adoption_likelihood_0_100 reflects YOUR segment's actual likelihood to adopt."
7. **Output instruction**: "Return valid JSON matching the PersonaResponse schema."

### Round 2 Prompt Additions

Round 2 appends the following sections after the evidence section:

8. **Discussion context**: "Here is what other panelists said in Round 1:" followed by a summary of each persona's Round 1 response (segment_label, overall_reaction, adoption_likelihood, strongest_positive, strongest_concern).
9. **Moderator question**: "The moderator asks: '{follow_up_question}'" with the disagreement summary for context.
10. **Revision instruction**: "You have now heard other panelists' perspectives and a moderator follow-up question. Update your position if the evidence warrants it. Explain what changed and why."

### Temperature and Thinking Settings

Both rounds use `temperature=0.2` (slight variety in responses while staying grounded) and `thinking_budget=None` which enables Gemini's thinking mode for complex reasoning about persona perspectives.

---

## Error Handling

- **TaskGroup exceptions**: If any persona's Gemini call fails within the TaskGroup, all remaining tasks are automatically cancelled. The phase function catches the resulting exception group and transitions to FAILED with a descriptive error message.
- **Grounding validation is non-fatal**: Stripping invalid chunk IDs and flagging low-grounding responses does NOT cause the phase to fail. These are metadata warnings only.
- **Semaphore timeout**: The semaphore acquisition itself has no timeout -- it waits indefinitely. The overall phase-level timeout (180s, enforced by the orchestrator) provides the safety net.

---

## Acceptance Criteria

1. All tests in `tests/test_simulation_rounds.py` pass.
2. `retrieve_phase()` calls `retrieve_for_persona()` for each persona in parallel and stores results in `state.retrieved_evidence`.
3. `round1_phase()` produces one `PersonaResponse` per persona with grounding-validated `cited_chunk_ids`.
4. `round2_phase()` includes Round 1 responses and the moderator question in each persona's prompt.
5. The Round 2 prompt contains the explicit revision instruction about updating positions based on evidence.
6. Grounding validation strips invalid `cited_chunk_ids` without dropping personas.
7. Low-grounding personas are flagged in `state.metadata` but remain in the response list.
8. Concurrent Gemini calls never exceed 5 simultaneous (semaphore enforced).
9. Anti-sycophancy instructions appear in the prompt template.
10. Both phases transition to the correct next phase on success (`ROUND1` -> `MODERATING`, `ROUND2` -> `ANALYZING`).
11. Both phases transition to `FAILED` with an error message if any Gemini call fails.
12. The `PANEL_RESPONSE_PROMPT` template in `core/simulation/prompts.py` is structured with named placeholders and supports both Round 1 (no discussion context) and Round 2 (with discussion context).