from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse
from core.simulation.analyst import synthesize_results


def _resp(pid: str) -> PersonaResponse:
    return PersonaResponse(
        persona_id=pid,
        overall_reaction="Test",
        adoption_likelihood_0_100=70,
        strongest_positive="Camera",
        strongest_concern="Price",
        feature_scores={"camera": 0.8},
        what_would_change_my_mind="Lower price",
        quotable_sentence="Quote.",
        cited_chunk_ids=["c1"],
    )


def _mock_summary() -> AnalystSummary:
    return AnalystSummary(
        consensus_themes=["Camera quality is valued"],
        disagreement_themes=["Price sensitivity varies"],
        top_risks=["Price resistance"],
        top_wins=["Camera appeal"],
        feature_recommendations=["Emphasize camera"],
        messaging_suggestions=["Lead with camera"],
        evidence_gaps=["Enterprise data missing"],
    )


@pytest.mark.asyncio
async def test_returns_analyst_summary():
    r1 = [_resp("p1"), _resp("p2")]
    r2 = [_resp("p1"), _resp("p2")]
    mq = ModeratorQuestion(
        disagreement_summary="Price debate",
        follow_up_question="What about price?",
        targeted_persona_ids=["p1"],
    )
    with patch("core.simulation.analyst.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = _mock_summary()
        result = await synthesize_results(r1, r2, mq)
    assert isinstance(result, AnalystSummary)
    assert len(result.consensus_themes) > 0
    assert len(result.top_risks) > 0
