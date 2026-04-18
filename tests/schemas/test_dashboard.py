from apps.api.schemas.dashboard import (
    DashboardPayload,
    FeatureScoreRow,
    PersonaSummary,
    QuoteCard,
    ScoredLabel,
    TribeResult,
)
from apps.api.schemas.simulation import AnalystSummary, PersonaResponse


def _make_analyst_summary():
    return AnalystSummary(
        consensus_themes=["Camera quality is a differentiator"],
        disagreement_themes=["Price sensitivity varies by segment"],
        top_risks=["Price may deter budget-conscious buyers"],
        top_wins=["Camera upgrade excites enthusiasts"],
        feature_recommendations=["Emphasize camera in marketing"],
        messaging_suggestions=["Lead with camera, address price second"],
        evidence_gaps=["Limited data on enterprise buyers"],
    )


def _make_persona_response():
    return PersonaResponse(
        persona_id="persona-1",
        overall_reaction="Positive",
        adoption_likelihood_0_100=75,
        strongest_positive="Camera",
        strongest_concern="Price",
        feature_scores={"camera": 0.9},
        what_would_change_my_mind="Lower price",
        quotable_sentence="Great camera.",
        cited_chunk_ids=["chunk-1"],
    )


def _make_dashboard(**overrides):
    defaults = {
        "project_id": "proj-1",
        "scenario_id": "scen-1",
        "consensus_score": 0.7,
        "disagreement_score": 0.3,
        "evidence_coverage": 0.85,
        "top_risks": [ScoredLabel(label="Price resistance", score=0.8)],
        "top_wins": [ScoredLabel(label="Camera excitement", score=0.9)],
        "feature_scores": {
            "camera": FeatureScoreRow(
                mean=0.85, min=0.7, max=1.0, std=0.1, persona_scores={"p1": 0.9}
            )
        },
        "personas": [
            PersonaSummary(
                persona_id="persona-1",
                segment_label="Tech Enthusiasts",
                summary="Early adopters",
                adoption_likelihood=75,
                strongest_positive="Camera",
                strongest_concern="Price",
                feature_priorities={"camera": 0.9},
            )
        ],
        "quotes": [
            QuoteCard(
                persona_id="persona-1",
                segment_label="Tech Enthusiasts",
                quote="Great camera.",
                facet="camera",
                sentiment="positive",
            )
        ],
        "round1_responses": [_make_persona_response()],
        "round2_responses": [_make_persona_response()],
        "moderator_question": "Why do you disagree on price?",
        "analyst_summary": _make_analyst_summary(),
        "tribe": None,
    }
    return DashboardPayload(**{**defaults, **overrides})


class TestDashboardPayload:
    def test_tribe_none_serializes(self):
        dashboard = _make_dashboard(tribe=None)
        data = dashboard.model_dump()
        restored = DashboardPayload.model_validate(data)
        assert restored.tribe is None

    def test_tribe_populated_serializes(self):
        tribe = TribeResult(
            enabled=True,
            response_strength=0.8,
            response_variance=0.3,
            response_spread=0.6,
            scored_text="Strong positive response expected",
        )
        dashboard = _make_dashboard(tribe=tribe)
        data = dashboard.model_dump()
        restored = DashboardPayload.model_validate(data)
        assert restored.tribe is not None
        assert restored.tribe.response_strength == 0.8


class TestScoredLabel:
    def test_roundtrip(self):
        original = ScoredLabel(label="Risk item", score=0.75)
        data = original.model_dump()
        restored = ScoredLabel.model_validate(data)
        assert restored == original


class TestFeatureScoreRow:
    def test_roundtrip(self):
        original = FeatureScoreRow(
            mean=0.8, min=0.5, max=1.0, std=0.15, persona_scores={"p1": 0.9, "p2": 0.7}
        )
        data = original.model_dump()
        restored = FeatureScoreRow.model_validate(data)
        assert restored == original


class TestQuoteCard:
    def test_roundtrip(self):
        original = QuoteCard(
            persona_id="p1",
            segment_label="Budget Buyers",
            quote="Too expensive for what you get.",
            facet="price",
            sentiment="negative",
        )
        data = original.model_dump()
        restored = QuoteCard.model_validate(data)
        assert restored == original


class TestTribeResult:
    def test_roundtrip(self):
        original = TribeResult(
            enabled=True,
            response_strength=0.82,
            response_variance=0.15,
            response_spread=0.67,
            scored_text="Strong positive response expected",
        )
        data = original.model_dump()
        restored = TribeResult.model_validate(data)
        assert restored == original
