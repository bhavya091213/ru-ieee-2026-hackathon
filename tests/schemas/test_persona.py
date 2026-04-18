from apps.api.schemas.persona import Belief, Persona, SkepticismProfile


def _make_persona(**overrides):
    defaults = {
        "segment_label": "Tech Enthusiasts",
        "summary": "Early adopters who prioritize camera quality",
        "jobs_to_be_done": ["Capture high-quality photos", "Share on social media"],
        "feature_priorities": {"camera": 0.9, "battery": 0.6, "price": 0.3},
        "beliefs": [
            Belief(
                claim="48MP is a major upgrade",
                stance="positive",
                evidence_chunk_ids=["chunk-1", "chunk-2"],
            )
        ],
        "skepticism_profile": SkepticismProfile(
            trust_in_reviews=0.8,
            trust_in_brand_claims=0.4,
            influencer_susceptibility=0.6,
        ),
        "graph_entity_ids": ["ent-1", "ent-2", "ent-3"],
    }
    return Persona(**{**defaults, **overrides})


class TestPersona:
    def test_with_graph_entity_ids_roundtrip(self):
        original = _make_persona()
        data = original.model_dump()
        restored = Persona.model_validate(data)
        assert restored == original
        assert restored.graph_entity_ids == ["ent-1", "ent-2", "ent-3"]


class TestBelief:
    def test_empty_evidence_chunk_ids_is_valid(self):
        belief = Belief(
            claim="Battery lasts all day",
            stance="positive",
            evidence_chunk_ids=[],
        )
        assert belief.evidence_chunk_ids == []
