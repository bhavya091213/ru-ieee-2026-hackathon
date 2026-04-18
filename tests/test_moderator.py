from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from apps.api.schemas.simulation import ModeratorQuestion, PersonaResponse
from core.simulation.moderator import analyze_disagreement


def _resp(pid: str, likelihood: int) -> PersonaResponse:
    return PersonaResponse(
        persona_id=pid,
        overall_reaction="Test",
        adoption_likelihood_0_100=likelihood,
        strongest_positive="Camera",
        strongest_concern="Price",
        feature_scores={"camera": 0.8},
        what_would_change_my_mind="Lower price",
        quotable_sentence="Test quote.",
        cited_chunk_ids=["c1"],
    )


def _mock_mq(**overrides) -> ModeratorQuestion:
    defaults = dict(
        disagreement_summary="Price vs camera debate",
        follow_up_question="What would change your mind about the price?",
        targeted_persona_ids=["p1", "p3"],
    )
    return ModeratorQuestion(**{**defaults, **overrides})


@pytest.mark.asyncio
async def test_returns_moderator_question():
    responses = [_resp("p1", 30), _resp("p2", 70), _resp("p3", 50)]
    with patch("core.simulation.moderator.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_mq()
        result = await analyze_disagreement(responses, ["Camera is great", "Price is high"])
    assert isinstance(result, ModeratorQuestion)
    assert len(result.follow_up_question) > 0


@pytest.mark.asyncio
async def test_strips_invalid_persona_ids():
    responses = [_resp("p1", 30), _resp("p2", 70)]
    with patch("core.simulation.moderator.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_mq(targeted_persona_ids=["p1", "p999"])
        result = await analyze_disagreement(responses, ["chunk"])
    assert "p999" not in result.targeted_persona_ids
    assert "p1" in result.targeted_persona_ids
