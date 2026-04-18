The section files for this workstream haven't been generated yet. That's fine -- I have all the context I need from the plan and TDD docs. Let me now produce the section content.

# Section 06: Orchestrator State Machine

## Overview

This section builds the simulation orchestrator's state machine infrastructure: the `SimPhase` enum, the immutable `SimulationState` frozen dataclass, the `transition()` method, and the `run_simulation()` loop that drives phases sequentially with timeout enforcement and fail-fast short-circuiting. This section contains **no phase implementations** -- those are added in sections 08, 09, and 10. The goal here is a fully tested skeleton that later sections plug concrete phase functions into.

## Dependencies

- **section-01-schemas**: Provides `Persona`, `Scenario`, `PersonaResponse`, `ModeratorQuestion`, `AnalystSummary`, `DashboardPayload`, and all supporting models. These types are referenced in `SimulationState` fields.
- **section-05-persona-synthesis**: Provides the `list[Persona]` that the orchestrator receives as input. The orchestrator does not call synthesis itself; it expects personas as a pre-built input.

## Files to Create

| File | Purpose |
|------|---------|
| `core/simulation/orchestrator.py` | `SimPhase` enum, `SimulationState` frozen dataclass, `transition()`, `run_simulation()` loop |
| `core/simulation/__init__.py` | Package init (may already exist from section-07) |
| `tests/test_orchestrator_state.py` | All tests for the state machine infrastructure |

## Background and Context

PanelForge's simulation runs as a six-phase pipeline:

1. **RETRIEVING** -- fetch evidence per persona (parallel)
2. **ROUND1** -- fan-out persona responses (parallel Gemini calls)
3. **MODERATING** -- moderator disagreement analysis (single Gemini call)
4. **ROUND2** -- persona revisions with discussion context (parallel)
5. **ANALYZING** -- analyst synthesis (single Gemini call)
6. **SCORING** -- optional TRIBE heuristic scoring (pure math, no LLM)

Plus terminal states: **DONE** and **FAILED**.

The orchestrator uses an **immutable state machine** pattern. `SimulationState` is a frozen dataclass. Each phase function takes a `SimulationState` and returns a **new** `SimulationState` via `dataclasses.replace()`. The original state object is never mutated.

Key design constraints:
- **Phase-level timeout**: 180 seconds per phase via `asyncio.timeout()`
- **Per-Gemini-call timeout**: 30 seconds (handled within phase implementations, not here)
- **Fail-fast**: if any phase sets `phase=FAILED`, the loop stops immediately and does not run subsequent phases
- **TRIBE gating**: the SCORING phase is only executed when `tribe_enabled=True` on the state; otherwise it is skipped
- **In-memory only**: no persistence -- state lives in Python objects

## Tests

All tests go in `tests/test_orchestrator_state.py`. Use `pytest` with `pytest-asyncio`.

```python
# tests/test_orchestrator_state.py

"""Tests for the simulation orchestrator state machine infrastructure."""

import asyncio
import pytest
from dataclasses import FrozenInstanceError

# Test: SimulationState is immutable (frozen dataclass)
# Create a SimulationState instance, attempt to assign to a field,
# assert FrozenInstanceError is raised.

# Test: SimulationState.transition returns new object, original unchanged
# Create state_a, call state_b = state_a.transition(phase=SimPhase.ROUND1),
# assert state_a.phase is still RETRIEVING, state_b.phase is ROUND1,
# assert state_a is not state_b.

# Test: SimPhase enum has all expected phases
# Assert SimPhase contains: RETRIEVING, ROUND1, MODERATING, ROUND2,
# ANALYZING, SCORING, DONE, FAILED. Assert it is a StrEnum so
# str(SimPhase.ROUND1) == "ROUND1".

# Test: run_simulation progresses through all phases in order
# Provide mock phase functions that record their call order.
# After run_simulation completes, assert the recorded order matches
# [RETRIEVING, ROUND1, MODERATING, ROUND2, ANALYZING, SCORING, DONE]
# when tribe_enabled=True.

# Test: run_simulation short-circuits on FAILED phase
# Provide a mock phase function for ROUND1 that returns state with
# phase=FAILED and an error message. Assert that MODERATING, ROUND2,
# ANALYZING, SCORING are never called. Assert final state has
# phase=FAILED and the error message is preserved.

# Test: run_simulation sets phase=DONE on success
# Run with all-passing mock phases. Assert final state.phase == DONE.

# Test: run_simulation respects phase-level timeout (180s)
# Provide a mock phase that sleeps for 200 seconds. Assert that
# run_simulation transitions to FAILED with a timeout-related error
# message within a reasonable wall-clock time (use a much shorter
# timeout override for testing, e.g., 0.1s).

# Test: run_simulation skips SCORING phase when tribe disabled
# Set tribe_enabled=False. Provide mock phases that record calls.
# Assert SCORING phase function is never invoked. Assert final
# state.phase == DONE.

# Test: run_simulation includes SCORING phase when tribe enabled
# Set tribe_enabled=True. Provide mock phases that record calls.
# Assert SCORING phase function IS invoked. Assert final
# state.phase == DONE.
```

## Implementation Details

### `SimPhase` StrEnum

Define `SimPhase` as a `StrEnum` (Python 3.11+ `enum.StrEnum`):

```python
from enum import StrEnum

class SimPhase(StrEnum):
    RETRIEVING = "RETRIEVING"
    ROUND1 = "ROUND1"
    MODERATING = "MODERATING"
    ROUND2 = "ROUND2"
    ANALYZING = "ANALYZING"
    SCORING = "SCORING"
    DONE = "DONE"
    FAILED = "FAILED"
```

### `SimulationState` Frozen Dataclass

A frozen (immutable) dataclass holding all state that flows through the pipeline. Each phase reads what it needs and returns a new state with its outputs filled in.

```python
from dataclasses import dataclass, field, replace
from typing import Any

@dataclass(frozen=True)
class SimulationState:
    """Immutable state that flows through the simulation pipeline.

    Each phase reads relevant fields and returns a new state via transition().
    """
    # --- Inputs (set at creation, never change) ---
    project_id: str
    scenario: Scenario              # from schemas
    personas: list[Persona]         # from synthesis pipeline
    tribe_enabled: bool = False

    # --- Phase tracking ---
    phase: SimPhase = SimPhase.RETRIEVING
    error: str | None = None

    # --- Accumulated outputs (filled in by phases) ---
    retrieved_evidence: dict[str, list] = field(default_factory=dict)
    # Maps persona_id -> list of RetrievalResult
    round1_responses: list[PersonaResponse] = field(default_factory=list)
    moderator_question: ModeratorQuestion | None = None
    round2_responses: list[PersonaResponse] = field(default_factory=list)
    analyst_summary: AnalystSummary | None = None
    tribe_result: TribeResult | None = None
    dashboard: DashboardPayload | None = None

    # --- Metadata ---
    metadata: dict[str, Any] = field(default_factory=dict)
    # For storing low_grounding flags, timing info, etc.

    def transition(self, **changes) -> "SimulationState":
        """Return a new SimulationState with the given fields replaced.

        The original state is unchanged (frozen dataclass guarantee).
        """
        return replace(self, **changes)
```

### `run_simulation()` Orchestrator Loop

The core loop iterates through the phase sequence, calling each phase's async function, enforcing timeouts, and short-circuiting on failure.

```python
import asyncio
import logging
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)

# Type alias for phase functions
PhaseFunc = Callable[[SimulationState], Awaitable[SimulationState]]

# The ordered sequence of (phase_enum, phase_function) pairs.
# Phase functions are registered here. Initially they are stubs/placeholders.
# Sections 08, 09, 10 replace them with real implementations.

PHASE_TIMEOUT_SECONDS: float = 180.0

async def run_simulation(
    state: SimulationState,
    phase_funcs: dict[SimPhase, PhaseFunc],
    phase_timeout: float = PHASE_TIMEOUT_SECONDS,
) -> SimulationState:
    """Execute the simulation pipeline as a sequential state machine.

    Iterates through phases in order: RETRIEVING -> ROUND1 -> MODERATING ->
    ROUND2 -> ANALYZING -> SCORING -> DONE.

    For each phase:
      1. Skip SCORING if state.tribe_enabled is False
      2. Look up the phase function in phase_funcs
      3. Execute it with asyncio.timeout(phase_timeout)
      4. If the returned state has phase=FAILED, stop immediately
      5. If timeout fires, transition to FAILED with timeout error
      6. On any exception, transition to FAILED with the error message

    Returns the final SimulationState (phase is DONE or FAILED).
    """
```

The phase execution order is a constant list:

```python
PHASE_ORDER: list[SimPhase] = [
    SimPhase.RETRIEVING,
    SimPhase.ROUND1,
    SimPhase.MODERATING,
    SimPhase.ROUND2,
    SimPhase.ANALYZING,
    SimPhase.SCORING,
]
```

After all phases complete without failure, the loop transitions to `DONE`.

### Key Implementation Notes

1. **Timeout handling**: Wrap each phase call in `async with asyncio.timeout(phase_timeout):`. Catch `asyncio.TimeoutError` and transition to `FAILED` with the message `f"Phase {phase.value} timed out after {phase_timeout}s"`.

2. **Exception handling**: Catch any `Exception` from a phase function and transition to `FAILED` with `str(e)` as the error. Log the full traceback at ERROR level.

3. **SCORING skip logic**: Before executing the SCORING phase, check `state.tribe_enabled`. If `False`, skip directly to DONE transition.

4. **Logging**: Log at INFO level when entering each phase and when a phase completes, including elapsed time. Log at ERROR level on failure or timeout.

5. **Phase function injection**: `run_simulation()` takes a `phase_funcs` dict rather than importing phase functions directly. This enables testing with mock phase functions and allows later sections to register their implementations without modifying this file. The dict maps `SimPhase` to its async handler.

6. **Testability via timeout override**: The `phase_timeout` parameter defaults to 180s but can be overridden in tests (e.g., 0.1s) to verify timeout behavior without waiting three minutes.

7. **No phase implementations in this section**: The phase functions (retrieve, round1, moderator, round2, analyst, scoring) are built in sections 07-10 and 12. This section provides only the execution harness. For testing `run_simulation()`, use simple mock phase functions that either pass through, record calls, or simulate failure.

### How Later Sections Plug In

Sections 08, 09, 10, and 12 each define async functions with the signature `async def phase_name(state: SimulationState) -> SimulationState`. When assembling the full pipeline (section 13 or in `routes/simulate.py`), these are collected into the `phase_funcs` dict:

```python
phase_funcs = {
    SimPhase.RETRIEVING: retrieve_phase,      # section 07/08
    SimPhase.ROUND1: round1_phase,            # section 08
    SimPhase.MODERATING: moderator_phase,     # section 09
    SimPhase.ROUND2: round2_phase,            # section 08
    SimPhase.ANALYZING: analyst_phase,        # section 09
    SimPhase.SCORING: scoring_phase,          # section 12
}
```