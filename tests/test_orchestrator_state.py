from __future__ import annotations

import asyncio
from dataclasses import FrozenInstanceError

import pytest

from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
from apps.api.schemas.scenario import Scenario
from core.simulation.orchestrator import (
    PHASE_ORDER,
    SimPhase,
    SimulationState,
    run_simulation,
)


def _make_state(**overrides) -> SimulationState:
    defaults = {
        "project_id": "proj-1",
        "scenario": Scenario(
            product_name="TestPhone",
            description="A test phone",
            hypotheses=["Camera matters"],
            facets_to_explore=["camera"],
        ),
        "personas": [
            Persona(
                segment_label="Testers",
                summary="Test persona",
                jobs_to_be_done=["test"],
                feature_priorities={"camera": 0.9},
                beliefs=[Belief(claim="Good", stance="positive", evidence_chunk_ids=["c1", "c2"])],
                skepticism_profile=SkepticismProfile(trust_in_reviews=0.7, trust_in_brand_claims=0.3, influencer_susceptibility=0.5),
                graph_entity_ids=["e1"],
            )
        ],
    }
    return SimulationState(**{**defaults, **overrides})


class TestSimulationState:
    def test_frozen(self):
        state = _make_state()
        with pytest.raises(FrozenInstanceError):
            state.phase = SimPhase.ROUND1  # type: ignore[misc]

    def test_transition_returns_new(self):
        a = _make_state()
        b = a.transition(phase=SimPhase.ROUND1)
        assert a.phase == SimPhase.RETRIEVING
        assert b.phase == SimPhase.ROUND1
        assert a is not b


class TestSimPhase:
    def test_all_phases_present(self):
        expected = {"RETRIEVING", "ROUND1", "MODERATING", "ROUND2", "ANALYZING", "SCORING", "DONE", "FAILED"}
        assert {p.value for p in SimPhase} == expected

    def test_is_str_enum(self):
        assert str(SimPhase.ROUND1) == "ROUND1"


class TestRunSimulation:
    @pytest.mark.asyncio
    async def test_progresses_through_all_phases(self):
        call_order: list[str] = []

        async def make_phase(phase_name: str):
            async def handler(state: SimulationState) -> SimulationState:
                call_order.append(phase_name)
                return state
            return handler

        phase_funcs = {}
        for phase in PHASE_ORDER:
            phase_funcs[phase] = await make_phase(phase.value)

        state = _make_state(tribe_enabled=True)
        result = await run_simulation(state, phase_funcs)
        assert result.phase == SimPhase.DONE
        assert call_order == [p.value for p in PHASE_ORDER]

    @pytest.mark.asyncio
    async def test_short_circuits_on_failed(self):
        call_order: list[str] = []

        async def pass_phase(state: SimulationState) -> SimulationState:
            call_order.append("RETRIEVING")
            return state

        async def fail_phase(state: SimulationState) -> SimulationState:
            call_order.append("ROUND1")
            return state.transition(phase=SimPhase.FAILED, error="boom")

        async def never_called(state: SimulationState) -> SimulationState:
            call_order.append("MODERATING")
            return state

        phase_funcs = {
            SimPhase.RETRIEVING: pass_phase,
            SimPhase.ROUND1: fail_phase,
            SimPhase.MODERATING: never_called,
        }
        state = _make_state()
        result = await run_simulation(state, phase_funcs)
        assert result.phase == SimPhase.FAILED
        assert "boom" in result.error
        assert "MODERATING" not in call_order

    @pytest.mark.asyncio
    async def test_done_on_success(self):
        async def noop(state: SimulationState) -> SimulationState:
            return state

        phase_funcs = {p: noop for p in PHASE_ORDER}
        state = _make_state()
        result = await run_simulation(state, phase_funcs)
        assert result.phase == SimPhase.DONE

    @pytest.mark.asyncio
    async def test_timeout_fails(self):
        async def slow(state: SimulationState) -> SimulationState:
            await asyncio.sleep(10)
            return state

        phase_funcs = {SimPhase.RETRIEVING: slow}
        state = _make_state()
        result = await run_simulation(state, phase_funcs, phase_timeout=0.05)
        assert result.phase == SimPhase.FAILED
        assert "timed out" in result.error

    @pytest.mark.asyncio
    async def test_skips_scoring_when_tribe_disabled(self):
        called: list[str] = []

        async def track(name: str):
            async def handler(state: SimulationState) -> SimulationState:
                called.append(name)
                return state
            return handler

        phase_funcs = {}
        for p in PHASE_ORDER:
            phase_funcs[p] = await track(p.value)

        state = _make_state(tribe_enabled=False)
        result = await run_simulation(state, phase_funcs)
        assert result.phase == SimPhase.DONE
        assert "SCORING" not in called

    @pytest.mark.asyncio
    async def test_includes_scoring_when_tribe_enabled(self):
        called: list[str] = []

        async def track(name: str):
            async def handler(state: SimulationState) -> SimulationState:
                called.append(name)
                return state
            return handler

        phase_funcs = {}
        for p in PHASE_ORDER:
            phase_funcs[p] = await track(p.value)

        state = _make_state(tribe_enabled=True)
        result = await run_simulation(state, phase_funcs)
        assert result.phase == SimPhase.DONE
        assert "SCORING" in called
