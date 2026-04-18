from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field, replace
from enum import StrEnum
from typing import Any, Awaitable, Callable

from apps.api.schemas.dashboard import DashboardPayload, TribeResult
from apps.api.schemas.persona import Persona
from apps.api.schemas.scenario import Scenario
from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse

logger = logging.getLogger(__name__)


class SimPhase(StrEnum):
    RETRIEVING = "RETRIEVING"
    ROUND1 = "ROUND1"
    MODERATING = "MODERATING"
    ROUND2 = "ROUND2"
    ANALYZING = "ANALYZING"
    SCORING = "SCORING"
    DONE = "DONE"
    FAILED = "FAILED"


@dataclass(frozen=True)
class SimulationState:
    project_id: str
    scenario: Scenario
    personas: list[Persona]
    tribe_enabled: bool = False

    phase: SimPhase = SimPhase.RETRIEVING
    error: str | None = None

    retrieved_evidence: dict[str, list] = field(default_factory=dict)
    round1_responses: list[PersonaResponse] = field(default_factory=list)
    moderator_question: ModeratorQuestion | None = None
    round2_responses: list[PersonaResponse] = field(default_factory=list)
    analyst_summary: AnalystSummary | None = None
    tribe_result: TribeResult | None = None
    dashboard: DashboardPayload | None = None

    metadata: dict[str, Any] = field(default_factory=dict)

    def transition(self, **changes: Any) -> SimulationState:
        return replace(self, **changes)


PhaseFunc = Callable[[SimulationState], Awaitable[SimulationState]]

PHASE_ORDER: list[SimPhase] = [
    SimPhase.RETRIEVING,
    SimPhase.ROUND1,
    SimPhase.MODERATING,
    SimPhase.ROUND2,
    SimPhase.ANALYZING,
    SimPhase.SCORING,
]

PHASE_TIMEOUT_SECONDS: float = 180.0


async def run_simulation(
    state: SimulationState,
    phase_funcs: dict[SimPhase, PhaseFunc],
    phase_timeout: float = PHASE_TIMEOUT_SECONDS,
) -> SimulationState:
    for phase in PHASE_ORDER:
        if phase == SimPhase.SCORING and not state.tribe_enabled:
            logger.info("Skipping SCORING phase (tribe disabled)")
            continue

        func = phase_funcs.get(phase)
        if func is None:
            logger.warning("No function registered for phase %s, skipping", phase.value)
            continue

        logger.info("Entering phase %s", phase.value)
        start = time.monotonic()

        try:
            async with asyncio.timeout(phase_timeout):
                state = await func(state)
        except TimeoutError:
            elapsed = time.monotonic() - start
            msg = f"Phase {phase.value} timed out after {elapsed:.1f}s"
            logger.error(msg)
            return state.transition(phase=SimPhase.FAILED, error=msg)
        except Exception as exc:
            logger.error("Phase %s failed: %s", phase.value, exc, exc_info=True)
            return state.transition(phase=SimPhase.FAILED, error=str(exc))

        elapsed = time.monotonic() - start
        logger.info("Phase %s completed in %.1fs", phase.value, elapsed)

        if state.phase == SimPhase.FAILED:
            logger.error("Phase %s set state to FAILED: %s", phase.value, state.error)
            return state

    return state.transition(phase=SimPhase.DONE)
