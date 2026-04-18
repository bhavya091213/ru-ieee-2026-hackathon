from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse


def _make_persona_response(**overrides):
    defaults = {
        "persona_id": "persona-1",
        "overall_reaction": "Positive but cautious about price",
        "adoption_likelihood_0_100": 72,
        "strongest_positive": "Camera quality improvement",
        "strongest_concern": "Price increase over last generation",
        "feature_scores": {"camera": 0.9, "battery": 0.7, "price": 0.4},
        "what_would_change_my_mind": "A significant price drop or trade-in offer",
        "quotable_sentence": "The camera alone makes this worth considering.",
        "cited_chunk_ids": ["chunk-1", "chunk-3", "chunk-7"],
    }
    return PersonaResponse(**{**defaults, **overrides})


class TestPersonaResponse:
    def test_roundtrip_all_fields(self):
        original = _make_persona_response()
        data = original.model_dump()
        restored = PersonaResponse.model_validate(data)
        assert restored == original


class TestModeratorQuestion:
    def test_roundtrip(self):
        original = ModeratorQuestion(
            disagreement_summary="Personas split on price sensitivity",
            follow_up_question="What price point would change your mind?",
            targeted_persona_ids=["persona-2", "persona-5"],
        )
        data = original.model_dump()
        restored = ModeratorQuestion.model_validate(data)
        assert restored == original


class TestAnalystSummary:
    def test_roundtrip(self):
        original = AnalystSummary(
            consensus_themes=["Camera quality is a differentiator"],
            disagreement_themes=["Price sensitivity varies by segment"],
            top_risks=["Price may deter budget-conscious buyers"],
            top_wins=["Camera upgrade excites enthusiasts"],
            feature_recommendations=["Emphasize camera in marketing"],
            messaging_suggestions=["Lead with camera, address price second"],
            evidence_gaps=["Limited data on enterprise buyers"],
        )
        data = original.model_dump()
        restored = AnalystSummary.model_validate(data)
        assert restored == original
