from __future__ import annotations

import pytest

from apps.api.schemas.scenario import Scenario
from apps.api.schemas.simulation import PersonaResponse
from core.scoring.heuristics import response_spread, response_strength, response_variance
from core.scoring.tribe_runner import score_tribe


def _make_response(
    likelihood: int = 50,
    feature_scores: dict[str, float] | None = None,
    persona_id: str = "persona-1",
) -> PersonaResponse:
    return PersonaResponse(
        persona_id=persona_id,
        overall_reaction="Interesting product",
        adoption_likelihood_0_100=likelihood,
        strongest_positive="Good camera",
        strongest_concern="High price",
        feature_scores=feature_scores or {},
        what_would_change_my_mind="Lower price",
        quotable_sentence="I'd buy it if the price was right.",
        cited_chunk_ids=["mock-camera-01"],
    )


def _make_scenario() -> Scenario:
    return Scenario(
        product_name="TestPhone",
        description="A test phone",
        hypotheses=["Users want better cameras"],
        facets_to_explore=["camera"],
    )


class TestResponseStrength:
    def test_all_neutral_returns_zero(self) -> None:
        responses = [_make_response(likelihood=50) for _ in range(4)]
        assert response_strength(responses) == 0.0

    def test_all_extreme_returns_one(self) -> None:
        responses = [
            _make_response(likelihood=0),
            _make_response(likelihood=100),
            _make_response(likelihood=0),
            _make_response(likelihood=100),
        ]
        assert response_strength(responses) == 1.0

    def test_mixed_returns_between_zero_and_one(self) -> None:
        responses = [
            _make_response(likelihood=30),
            _make_response(likelihood=70),
            _make_response(likelihood=50),
            _make_response(likelihood=80),
        ]
        result = response_strength(responses)
        assert 0.0 < result < 1.0

    def test_single_response(self) -> None:
        result = response_strength([_make_response(likelihood=75)])
        assert result == pytest.approx(0.5)


class TestResponseVariance:
    def test_all_equal_returns_zero(self) -> None:
        responses = [_make_response(likelihood=75) for _ in range(4)]
        assert response_variance(responses) == 0.0

    def test_narrow_less_than_wide(self) -> None:
        narrow = [_make_response(likelihood=v) for v in (48, 50, 52)]
        wide = [_make_response(likelihood=v) for v in (10, 50, 90)]
        assert response_variance(narrow) < response_variance(wide)

    def test_clamped_to_zero_one(self) -> None:
        responses = [_make_response(likelihood=0), _make_response(likelihood=100)]
        result = response_variance(responses)
        assert 0.0 <= result <= 1.0

    def test_single_response_returns_zero(self) -> None:
        assert response_variance([_make_response(likelihood=50)]) == 0.0


class TestResponseSpread:
    def test_identical_scores_returns_zero(self) -> None:
        scores = {"camera": 0.8, "battery": 0.6}
        responses = [_make_response(feature_scores=scores) for _ in range(3)]
        assert response_spread(responses) == 0.0

    def test_divergent_greater_than_uniform(self) -> None:
        uniform = [
            _make_response(feature_scores={"camera": 0.5, "battery": 0.5}),
            _make_response(feature_scores={"camera": 0.5, "battery": 0.5}),
        ]
        divergent = [
            _make_response(feature_scores={"camera": 0.1, "battery": 0.9}),
            _make_response(feature_scores={"camera": 0.9, "battery": 0.1}),
        ]
        assert response_spread(uniform) < response_spread(divergent)

    def test_missing_facets_handled(self) -> None:
        responses = [
            _make_response(feature_scores={"camera": 0.8}),
            _make_response(feature_scores={"battery": 0.6}),
        ]
        result = response_spread(responses)
        assert 0.0 <= result <= 1.0

    def test_empty_feature_scores_returns_zero(self) -> None:
        responses = [_make_response(feature_scores={}) for _ in range(3)]
        assert response_spread(responses) == 0.0

    def test_single_response_returns_zero(self) -> None:
        responses = [_make_response(feature_scores={"camera": 0.8})]
        assert response_spread(responses) == 0.0


class TestScoredText:
    def test_low_scores_indicate_mild(self) -> None:
        from core.scoring.tribe_runner import _build_scored_text

        text = _build_scored_text(0.1, 0.1, 0.1)
        assert "mild" in text.lower()

    def test_high_scores_indicate_strong(self) -> None:
        from core.scoring.tribe_runner import _build_scored_text

        text = _build_scored_text(0.8, 0.8, 0.8)
        assert "strong" in text.lower()

    def test_moderate_scores(self) -> None:
        from core.scoring.tribe_runner import _build_scored_text

        text = _build_scored_text(0.45, 0.45, 0.45)
        assert "moderate" in text.lower()


class TestScoreTribe:
    @pytest.mark.asyncio
    async def test_returns_tribe_result(self) -> None:
        from apps.api.schemas.dashboard import TribeResult

        responses = [
            _make_response(likelihood=30, feature_scores={"camera": 0.3}),
            _make_response(likelihood=80, feature_scores={"camera": 0.9}),
        ]
        result = await score_tribe(responses, _make_scenario())
        assert isinstance(result, TribeResult)
        assert result.enabled is True

    @pytest.mark.asyncio
    async def test_all_scores_in_range(self) -> None:
        responses = [
            _make_response(likelihood=20, feature_scores={"camera": 0.2, "battery": 0.8}),
            _make_response(likelihood=90, feature_scores={"camera": 0.9, "battery": 0.3}),
        ]
        result = await score_tribe(responses, _make_scenario())
        assert 0.0 <= result.response_strength <= 1.0
        assert 0.0 <= result.response_variance <= 1.0
        assert 0.0 <= result.response_spread <= 1.0

    @pytest.mark.asyncio
    async def test_scored_text_non_empty(self) -> None:
        responses = [_make_response(likelihood=50)]
        result = await score_tribe(responses, _make_scenario())
        assert result.scored_text.strip()

    @pytest.mark.asyncio
    async def test_single_persona_no_error(self) -> None:
        result = await score_tribe([_make_response(likelihood=60)], _make_scenario())
        assert result.enabled is True

    @pytest.mark.asyncio
    async def test_empty_responses(self) -> None:
        result = await score_tribe([], _make_scenario())
        assert result.response_strength == 0.0
        assert result.response_variance == 0.0
        assert result.response_spread == 0.0

    @pytest.mark.asyncio
    async def test_empty_feature_scores(self) -> None:
        responses = [_make_response(likelihood=70, feature_scores={}) for _ in range(3)]
        result = await score_tribe(responses, _make_scenario())
        assert result.response_spread == 0.0
