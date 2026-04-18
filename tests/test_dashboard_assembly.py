from __future__ import annotations

import statistics

import pytest

from apps.api.schemas.dashboard import DashboardPayload, TribeResult
from apps.api.schemas.persona import Belief, Persona, SkepticismProfile
from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse
from core.simulation.dashboard import (
    aggregate_feature_scores,
    assemble_dashboard,
    build_persona_summaries,
    compute_consensus_score,
    compute_disagreement_score,
    compute_evidence_coverage,
    extract_quotes,
)


def _resp(pid: str, likelihood: int, feature_scores: dict[str, float] | None = None, chunks: list[str] | None = None) -> PersonaResponse:
    return PersonaResponse(
        persona_id=pid,
        overall_reaction="Good",
        adoption_likelihood_0_100=likelihood,
        strongest_positive="Camera",
        strongest_concern="Price",
        feature_scores=feature_scores or {"camera": 0.8},
        what_would_change_my_mind="Lower price",
        quotable_sentence=f"Quote from {pid}.",
        cited_chunk_ids=chunks or ["c1", "c2", "c3"],
    )


def _persona(label: str) -> Persona:
    return Persona(
        segment_label=label,
        summary=f"Persona {label}",
        jobs_to_be_done=["test"],
        feature_priorities={"camera": 0.9, "battery": 0.5},
        beliefs=[Belief(claim="Test", stance="positive", evidence_chunk_ids=["c1", "c2"])],
        skepticism_profile=SkepticismProfile(trust_in_reviews=0.7, trust_in_brand_claims=0.3, influencer_susceptibility=0.5),
        graph_entity_ids=["e1"],
    )


class TestConsensusScore:
    def test_perfect_agreement(self):
        assert compute_consensus_score([75.0, 75.0, 75.0]) == 1.0

    def test_max_disagreement(self):
        result = compute_consensus_score([0.0, 100.0])
        assert result <= 0.1  # std = 50, formula yields ~0

    def test_single_value(self):
        assert compute_consensus_score([50.0]) == 1.0


class TestDisagreementScore:
    def test_all_agree(self):
        responses = [_resp("a", 50, {"camera": 0.8}), _resp("b", 50, {"camera": 0.8})]
        assert compute_disagreement_score(responses) == 0.0

    def test_disagreement(self):
        responses = [_resp("a", 50, {"camera": 0.2}), _resp("b", 50, {"camera": 0.9})]
        assert compute_disagreement_score(responses) > 0.0


class TestEvidenceCoverage:
    def test_all_adequate(self):
        responses = [_resp("a", 50, chunks=["c1", "c2", "c3"]), _resp("b", 50, chunks=["c4", "c5", "c6"])]
        assert compute_evidence_coverage(responses) == 1.0

    def test_none_adequate(self):
        responses = [_resp("a", 50, chunks=["c1"]), _resp("b", 50, chunks=["c2"])]
        assert compute_evidence_coverage(responses) == 0.0

    def test_partial(self):
        responses = [_resp("a", 50, chunks=["c1", "c2", "c3"]), _resp("b", 50, chunks=["c1"])]
        assert compute_evidence_coverage(responses) == 0.5


class TestExtractQuotes:
    def test_extracts_quotes(self):
        responses = [_resp("p1", 70), _resp("p2", 30)]
        personas = [_persona("p1"), _persona("p2")]
        quotes = extract_quotes(responses, personas)
        assert len(quotes) == 2

    def test_skips_empty_quote(self):
        r = _resp("p1", 50)
        r = r.model_copy(update={"quotable_sentence": ""})
        quotes = extract_quotes([r], [_persona("p1")])
        assert len(quotes) == 0


class TestAggregateFeatureScores:
    def test_computes_stats(self):
        responses = [
            _resp("a", 50, {"camera": 0.8, "battery": 0.6}),
            _resp("b", 50, {"camera": 0.6, "battery": 0.4}),
        ]
        result = aggregate_feature_scores(responses)
        assert "camera" in result
        assert result["camera"].mean == pytest.approx(0.7)
        assert result["camera"].min == 0.6
        assert result["camera"].max == 0.8


class TestAssembleDashboard:
    def test_produces_valid_payload(self):
        r1 = [_resp("p1", 70), _resp("p2", 50)]
        r2 = [_resp("p1", 75), _resp("p2", 45)]
        personas = [_persona("p1"), _persona("p2")]
        mq = ModeratorQuestion(disagreement_summary="Test", follow_up_question="Why?", targeted_persona_ids=["p1"])
        analyst = AnalystSummary(
            consensus_themes=["Camera"], disagreement_themes=["Price"],
            top_risks=["Price"], top_wins=["Camera"],
            feature_recommendations=["Focus camera"], messaging_suggestions=["Lead camera"],
            evidence_gaps=["Enterprise"],
        )
        result = assemble_dashboard("proj-1", "scen-1", personas, r1, r2, mq, analyst)
        assert isinstance(result, DashboardPayload)
        assert 0.0 <= result.consensus_score <= 1.0
        assert result.tribe is None

    def test_with_tribe(self):
        r1 = [_resp("p1", 70)]
        r2 = [_resp("p1", 75)]
        personas = [_persona("p1")]
        mq = ModeratorQuestion(disagreement_summary="Test", follow_up_question="Why?", targeted_persona_ids=["p1"])
        analyst = AnalystSummary(
            consensus_themes=["Camera"], disagreement_themes=["Price"],
            top_risks=["Price"], top_wins=["Camera"],
            feature_recommendations=["Focus"], messaging_suggestions=["Lead"],
            evidence_gaps=["Gap"],
        )
        tribe = TribeResult(enabled=True, response_strength=0.7, response_variance=0.3, response_spread=0.5, scored_text="Strong")
        result = assemble_dashboard("proj-1", "scen-1", personas, r1, r2, mq, analyst, tribe)
        assert result.tribe is not None
        assert result.tribe.enabled is True
