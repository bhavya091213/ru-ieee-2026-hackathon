from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
from apps.api.schemas.retrieval import RetrievalResult
from apps.api.schemas.scenario import Scenario
from apps.api.schemas.simulation import ModeratorQuestion, PersonaResponse
from core.simulation.orchestrator import SimPhase, SimulationState
from core.simulation.rounds import (
    _get_valid_chunk_ids,
    retrieve_phase,
    round1_phase,
    round2_phase,
    validate_grounding,
)


def _make_persona(label: str = "Tech Enthusiast") -> Persona:
    return Persona(
        segment_label=label,
        summary="Early adopter",
        jobs_to_be_done=["test"],
        feature_priorities={"camera": 0.9},
        beliefs=[Belief(claim="test", stance="positive", evidence_chunk_ids=["c1", "c2"])],
        skepticism_profile=SkepticismProfile(
            trust_in_reviews=0.7, trust_in_brand_claims=0.3, influencer_susceptibility=0.5
        ),
        graph_entity_ids=["e1"],
    )


def _make_scenario() -> Scenario:
    return Scenario(
        product_name="TestPhone",
        description="A test phone",
        hypotheses=["Camera matters"],
        facets_to_explore=["camera"],
    )


def _make_retrieval_result(chunk_id: str = "mock-camera-01") -> RetrievalResult:
    return RetrievalResult(
        chunk_id=chunk_id,
        text="Great camera quality with sharp detail.",
        facet="camera",
        stance="positive",
        community_id="community-camera-pos",
    )


def _make_persona_response(persona_id: str = "persona-1", cited: list[str] | None = None) -> PersonaResponse:
    return PersonaResponse(
        persona_id=persona_id,
        overall_reaction="Interesting product",
        adoption_likelihood_0_100=70,
        strongest_positive="Great camera",
        strongest_concern="High price",
        feature_scores={"camera": 0.8, "battery": 0.6},
        what_would_change_my_mind="Lower price",
        quotable_sentence="I'd buy it if cheaper.",
        cited_chunk_ids=cited or ["mock-camera-01"],
    )


def _make_state(**kwargs) -> SimulationState:
    defaults = {
        "project_id": "proj-1",
        "scenario": _make_scenario(),
        "personas": [_make_persona("Alpha"), _make_persona("Beta"), _make_persona("Gamma")],
    }
    defaults.update(kwargs)
    return SimulationState(**defaults)


class TestValidateGrounding:
    def test_strips_invalid_chunk_ids(self) -> None:
        response = _make_persona_response(cited=["valid-1", "invalid-999"])
        valid_ids = {"valid-1"}
        cleaned, low = validate_grounding(response, valid_ids)
        assert cleaned.cited_chunk_ids == ["valid-1"]
        assert not low

    def test_flags_low_grounding_when_all_invalid(self) -> None:
        response = _make_persona_response(cited=["nonexistent-1", "nonexistent-2"])
        valid_ids = {"valid-1"}
        cleaned, low = validate_grounding(response, valid_ids)
        assert cleaned.cited_chunk_ids == []
        assert low

    def test_preserves_all_valid_ids(self) -> None:
        response = _make_persona_response(cited=["c1", "c2", "c3"])
        valid_ids = {"c1", "c2", "c3"}
        cleaned, low = validate_grounding(response, valid_ids)
        assert cleaned.cited_chunk_ids == ["c1", "c2", "c3"]
        assert not low

    def test_does_not_drop_persona(self) -> None:
        response = _make_persona_response(cited=["bad-1"])
        cleaned, low = validate_grounding(response, set())
        assert cleaned.persona_id == response.persona_id
        assert low


class TestGetValidChunkIds:
    def test_extracts_chunk_ids_from_retrieval_results(self) -> None:
        evidence = {
            "Alpha": [_make_retrieval_result("c1"), _make_retrieval_result("c2")],
        }
        ids = _get_valid_chunk_ids("Alpha", evidence)
        assert ids == {"c1", "c2"}

    def test_returns_empty_for_missing_persona(self) -> None:
        ids = _get_valid_chunk_ids("Unknown", {})
        assert ids == set()


class TestRetrievePhase:
    @pytest.mark.asyncio
    async def test_calls_retrieve_for_each_persona(self) -> None:
        state = _make_state()
        mock_results = [_make_retrieval_result()]

        with patch("core.simulation.rounds.retrieve_for_persona", new_callable=AsyncMock) as mock_retrieve:
            mock_retrieve.return_value = mock_results
            result = await retrieve_phase(state)

        assert mock_retrieve.call_count == 3
        assert result.phase == SimPhase.ROUND1

    @pytest.mark.asyncio
    async def test_stores_evidence_keyed_by_label(self) -> None:
        state = _make_state()
        mock_results = [_make_retrieval_result()]

        with patch("core.simulation.rounds.retrieve_for_persona", new_callable=AsyncMock) as mock_retrieve:
            mock_retrieve.return_value = mock_results
            result = await retrieve_phase(state)

        assert "Alpha" in result.retrieved_evidence
        assert "Beta" in result.retrieved_evidence
        assert len(result.retrieved_evidence["Alpha"]) == 1

    @pytest.mark.asyncio
    async def test_fails_on_retrieval_error(self) -> None:
        state = _make_state()

        with patch("core.simulation.rounds.retrieve_for_persona", new_callable=AsyncMock) as mock_retrieve:
            mock_retrieve.side_effect = RuntimeError("retrieval failed")
            result = await retrieve_phase(state)

        assert result.phase == SimPhase.FAILED
        assert result.error is not None


class TestRound1Phase:
    @pytest.mark.asyncio
    async def test_calls_gemini_for_each_persona(self) -> None:
        evidence = {
            "Alpha": [_make_retrieval_result("c1")],
            "Beta": [_make_retrieval_result("c2")],
            "Gamma": [_make_retrieval_result("c3")],
        }
        state = _make_state(
            retrieved_evidence=evidence,
            phase=SimPhase.ROUND1,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(cited=["c1"])
            result = await round1_phase(state)

        assert mock_gen.call_count == 3
        assert result.phase == SimPhase.MODERATING
        assert len(result.round1_responses) == 3

    @pytest.mark.asyncio
    async def test_uses_temperature_02(self) -> None:
        evidence = {"Alpha": [_make_retrieval_result("c1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            phase=SimPhase.ROUND1,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(cited=["c1"])
            await round1_phase(state)

        assert mock_gen.call_args.kwargs.get("temperature") == 0.2

    @pytest.mark.asyncio
    async def test_grounding_validation_runs(self) -> None:
        evidence = {"Alpha": [_make_retrieval_result("valid-1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            phase=SimPhase.ROUND1,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(cited=["valid-1", "invalid-99"])
            result = await round1_phase(state)

        assert result.round1_responses[0].cited_chunk_ids == ["valid-1"]

    @pytest.mark.asyncio
    async def test_flags_low_grounding_in_metadata(self) -> None:
        evidence = {"Alpha": [_make_retrieval_result("valid-1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            phase=SimPhase.ROUND1,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(persona_id="p1", cited=["nonexistent"])
            result = await round1_phase(state)

        assert "p1" in result.metadata["low_grounding_round1"]

    @pytest.mark.asyncio
    async def test_fails_on_gemini_error(self) -> None:
        evidence = {"Alpha": [_make_retrieval_result("c1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            phase=SimPhase.ROUND1,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.side_effect = ValueError("Gemini failed")
            result = await round1_phase(state)

        assert result.phase == SimPhase.FAILED


class TestRound2Phase:
    @pytest.mark.asyncio
    async def test_includes_round1_and_moderator_in_prompt(self) -> None:
        r1_responses = [_make_persona_response(persona_id="Alpha", cited=["c1"])]
        mod_q = ModeratorQuestion(
            disagreement_summary="Price vs camera",
            follow_up_question="What would change your mind about the price?",
            targeted_persona_ids=["Alpha"],
        )
        evidence = {"Alpha": [_make_retrieval_result("c1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            round1_responses=r1_responses,
            moderator_question=mod_q,
            phase=SimPhase.ROUND2,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(cited=["c1"])
            await round2_phase(state)

        prompt = mock_gen.call_args.kwargs.get("prompt") or mock_gen.call_args.args[0]
        assert "What would change your mind about the price?" in prompt
        assert "Update your position" in prompt

    @pytest.mark.asyncio
    async def test_returns_round2_responses(self) -> None:
        r1_responses = [_make_persona_response(persona_id="Alpha", cited=["c1"])]
        mod_q = ModeratorQuestion(
            disagreement_summary="test",
            follow_up_question="test?",
            targeted_persona_ids=["Alpha"],
        )
        evidence = {"Alpha": [_make_retrieval_result("c1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            round1_responses=r1_responses,
            moderator_question=mod_q,
            phase=SimPhase.ROUND2,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(cited=["c1"])
            result = await round2_phase(state)

        assert result.phase == SimPhase.ANALYZING
        assert len(result.round2_responses) == 1

    @pytest.mark.asyncio
    async def test_grounding_validation_on_round2(self) -> None:
        r1_responses = [_make_persona_response(persona_id="Alpha", cited=["c1"])]
        mod_q = ModeratorQuestion(
            disagreement_summary="test",
            follow_up_question="test?",
            targeted_persona_ids=["Alpha"],
        )
        evidence = {"Alpha": [_make_retrieval_result("valid-1")]}
        state = _make_state(
            personas=[_make_persona("Alpha")],
            retrieved_evidence=evidence,
            round1_responses=r1_responses,
            moderator_question=mod_q,
            phase=SimPhase.ROUND2,
        )

        with patch("core.simulation.rounds.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_persona_response(cited=["valid-1", "bad-id"])
            result = await round2_phase(state)

        assert result.round2_responses[0].cited_chunk_ids == ["valid-1"]


class TestSemaphoreRateLimiting:
    @pytest.mark.asyncio
    async def test_concurrent_calls_limited(self) -> None:
        personas = [_make_persona(f"P{i}") for i in range(10)]
        evidence = {f"P{i}": [_make_retrieval_result(f"c{i}")] for i in range(10)}
        state = _make_state(
            personas=personas,
            retrieved_evidence=evidence,
            phase=SimPhase.ROUND1,
        )

        max_concurrent = 0
        current_concurrent = 0
        lock = asyncio.Lock()

        original_gen = AsyncMock()

        async def tracking_gen(*args, **kwargs):
            nonlocal max_concurrent, current_concurrent
            async with lock:
                current_concurrent += 1
                if current_concurrent > max_concurrent:
                    max_concurrent = current_concurrent
            await asyncio.sleep(0.01)
            async with lock:
                current_concurrent -= 1
            return _make_persona_response(cited=[f"c0"])

        with patch("core.simulation.rounds.generate_structured", side_effect=tracking_gen):
            await round1_phase(state)

        assert max_concurrent <= 5
