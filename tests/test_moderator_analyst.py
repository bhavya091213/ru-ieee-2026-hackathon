from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse
from core.simulation.moderator import analyze_disagreement
from core.simulation.analyst import synthesize_results


def _make_persona_response(persona_id: str = "persona-1", likelihood: int = 70) -> PersonaResponse:
    return PersonaResponse(
        persona_id=persona_id,
        overall_reaction="Interesting product",
        adoption_likelihood_0_100=likelihood,
        strongest_positive="Great camera",
        strongest_concern="High price",
        feature_scores={"camera": 0.8, "battery": 0.6},
        what_would_change_my_mind="Lower price",
        quotable_sentence="I'd buy it if cheaper.",
        cited_chunk_ids=["c1"],
    )


def _make_moderator_question() -> ModeratorQuestion:
    return ModeratorQuestion(
        disagreement_summary="Price sensitivity varies widely",
        follow_up_question="What price point would change your mind?",
        targeted_persona_ids=["persona-1", "persona-2"],
    )


def _make_analyst_summary() -> AnalystSummary:
    return AnalystSummary(
        consensus_themes=["Camera quality is top priority"],
        disagreement_themes=["Price sensitivity differs by segment"],
        top_risks=["High price point deters budget-conscious"],
        top_wins=["Camera quality impresses all segments"],
        feature_recommendations=["Highlight camera in marketing"],
        messaging_suggestions=["Lead with camera, address price with value"],
        evidence_gaps=["No data on long-term durability"],
    )


class TestAnalyzeDisagreement:
    @pytest.mark.asyncio
    async def test_returns_moderator_question(self) -> None:
        responses = [_make_persona_response("p1", 30), _make_persona_response("p2", 80)]
        mock_result = _make_moderator_question()

        with patch("core.simulation.moderator.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = mock_result.model_copy(
                update={"targeted_persona_ids": ["p1", "p2"]}
            )
            result = await analyze_disagreement(responses, ["Camera opinions vary"])

        assert isinstance(result, ModeratorQuestion)
        assert result.follow_up_question

    @pytest.mark.asyncio
    async def test_strips_invalid_persona_ids(self) -> None:
        responses = [_make_persona_response("p1")]
        mock_result = ModeratorQuestion(
            disagreement_summary="test",
            follow_up_question="test?",
            targeted_persona_ids=["p1", "nonexistent-99"],
        )

        with patch("core.simulation.moderator.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = mock_result
            result = await analyze_disagreement(responses, [])

        assert "nonexistent-99" not in result.targeted_persona_ids
        assert "p1" in result.targeted_persona_ids

    @pytest.mark.asyncio
    async def test_prompt_contains_responses(self) -> None:
        responses = [_make_persona_response("p1", 30)]

        with patch("core.simulation.moderator.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_moderator_question()
            await analyze_disagreement(responses, ["summary"])

        prompt = mock_gen.call_args.kwargs.get("prompt") or mock_gen.call_args.args[0]
        assert "p1" in prompt


class TestSynthesizeResults:
    @pytest.mark.asyncio
    async def test_returns_analyst_summary(self) -> None:
        r1 = [_make_persona_response("p1")]
        r2 = [_make_persona_response("p1", 80)]
        mod_q = _make_moderator_question()

        with patch("core.simulation.analyst.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_analyst_summary()
            result = await synthesize_results(r1, r2, mod_q)

        assert isinstance(result, AnalystSummary)
        assert len(result.consensus_themes) > 0
        assert len(result.top_risks) > 0

    @pytest.mark.asyncio
    async def test_prompt_contains_all_rounds(self) -> None:
        r1 = [_make_persona_response("p1")]
        r2 = [_make_persona_response("p1", 80)]
        mod_q = _make_moderator_question()

        with patch("core.simulation.analyst.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = _make_analyst_summary()
            await synthesize_results(r1, r2, mod_q)

        prompt = mock_gen.call_args.kwargs.get("prompt") or mock_gen.call_args.args[0]
        assert "p1" in prompt
        assert "What price point" in prompt
