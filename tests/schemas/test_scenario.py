import pytest
from pydantic import ValidationError

from apps.api.schemas.scenario import Scenario


def _make_scenario(**overrides):
    defaults = {
        "product_name": "iPhone 17",
        "description": "Next-gen smartphone with AI features",
        "hypotheses": ["Users will pay premium for AI camera"],
        "facets_to_explore": ["camera", "price"],
    }
    return Scenario(**{**defaults, **overrides})


class TestScenarioValidators:
    def test_rejects_empty_product_name(self):
        with pytest.raises(ValidationError):
            _make_scenario(product_name="")

    def test_rejects_whitespace_only_product_name(self):
        with pytest.raises(ValidationError):
            _make_scenario(product_name="   ")

    def test_rejects_product_name_over_200_chars(self):
        with pytest.raises(ValidationError):
            _make_scenario(product_name="x" * 201)

    def test_rejects_more_than_10_hypotheses(self):
        with pytest.raises(ValidationError):
            _make_scenario(hypotheses=[f"hypothesis {i}" for i in range(11)])

    def test_rejects_hypothesis_over_500_chars(self):
        with pytest.raises(ValidationError):
            _make_scenario(hypotheses=["x" * 501])

    def test_accepts_any_facet_and_normalizes(self):
        scenario = _make_scenario(facets_to_explore=["GPU Performance", "THERMAL"])
        assert scenario.facets_to_explore == ["gpu performance", "thermal"]

    def test_valid_scenario_passes(self):
        scenario = _make_scenario()
        assert scenario.product_name == "iPhone 17"
        assert scenario.facets_to_explore == ["camera", "price"]
