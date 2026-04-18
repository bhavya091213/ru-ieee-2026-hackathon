from __future__ import annotations

import statistics

from apps.api.schemas.dashboard import (
    DashboardPayload,
    FeatureScoreRow,
    PersonaSummary,
    QuoteCard,
    ScoredLabel,
    TribeResult,
)
from apps.api.schemas.persona import Persona
from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse


def compute_consensus_score(adoption_likelihoods: list[float]) -> float:
    if len(adoption_likelihoods) < 2:
        return 1.0
    std_val = statistics.stdev(adoption_likelihoods)
    return max(0.0, min(1.0, 1.0 - (std_val / 50.0)))


def compute_disagreement_score(round2_responses: list[PersonaResponse]) -> float:
    facet_scores: dict[str, list[float]] = {}
    for r in round2_responses:
        for facet, score in r.feature_scores.items():
            facet_scores.setdefault(facet, []).append(score)

    stds: list[float] = []
    for scores in facet_scores.values():
        if len(scores) >= 2:
            stds.append(statistics.stdev(scores))

    if not stds:
        return 0.0
    return max(0.0, min(1.0, statistics.mean(stds)))


def compute_evidence_coverage(round2_responses: list[PersonaResponse]) -> float:
    if not round2_responses:
        return 0.0
    adequate = sum(
        1 for r in round2_responses if len(set(r.cited_chunk_ids)) >= 3
    )
    return adequate / len(round2_responses)


def extract_quotes(
    round2_responses: list[PersonaResponse],
    personas: list[Persona],
) -> list[QuoteCard]:
    persona_map = {p.segment_label: p for p in personas}
    # also map by potential persona_id patterns
    quotes: list[QuoteCard] = []

    for r in round2_responses:
        if not r.quotable_sentence or not r.quotable_sentence.strip():
            continue

        persona = None
        for p in personas:
            if p.segment_label == r.persona_id or r.persona_id in p.segment_label:
                persona = p
                break
        if persona is None and personas:
            # fallback: match by index
            idx = round2_responses.index(r)
            if idx < len(personas):
                persona = personas[idx]

        if persona is None:
            continue

        top_facet = "other"
        if persona.feature_priorities:
            top_facet = max(persona.feature_priorities, key=persona.feature_priorities.get)

        if r.adoption_likelihood_0_100 > 60:
            sentiment = "positive"
        elif r.adoption_likelihood_0_100 < 40:
            sentiment = "negative"
        else:
            sentiment = "mixed"

        quotes.append(QuoteCard(
            persona_id=r.persona_id,
            segment_label=persona.segment_label,
            quote=r.quotable_sentence,
            facet=top_facet,
            sentiment=sentiment,
        ))

    return quotes


def aggregate_feature_scores(
    round2_responses: list[PersonaResponse],
) -> dict[str, FeatureScoreRow]:
    facet_data: dict[str, dict[str, float]] = {}

    for r in round2_responses:
        for facet, score in r.feature_scores.items():
            if facet not in facet_data:
                facet_data[facet] = {}
            facet_data[facet][r.persona_id] = score

    result: dict[str, FeatureScoreRow] = {}
    for facet, persona_scores in facet_data.items():
        scores = list(persona_scores.values())
        std = statistics.stdev(scores) if len(scores) >= 2 else 0.0
        result[facet] = FeatureScoreRow(
            mean=statistics.mean(scores),
            min=min(scores),
            max=max(scores),
            std=std,
            persona_scores=persona_scores,
        )

    return result


def build_persona_summaries(
    personas: list[Persona],
    round2_responses: list[PersonaResponse],
) -> list[PersonaSummary]:
    response_map: dict[str, PersonaResponse] = {}
    for r in round2_responses:
        response_map[r.persona_id] = r

    summaries: list[PersonaSummary] = []
    for i, persona in enumerate(personas):
        resp = response_map.get(persona.segment_label)
        if resp is None and i < len(round2_responses):
            resp = round2_responses[i]
        if resp is None:
            continue

        summaries.append(PersonaSummary(
            persona_id=resp.persona_id,
            segment_label=persona.segment_label,
            summary=persona.summary,
            adoption_likelihood=resp.adoption_likelihood_0_100,
            strongest_positive=resp.strongest_positive,
            strongest_concern=resp.strongest_concern,
            feature_priorities=persona.feature_priorities,
        ))

    return summaries


def _scored_labels(items: list[str]) -> list[ScoredLabel]:
    if not items:
        return []
    step = 1.0 / len(items) if len(items) > 1 else 1.0
    return [
        ScoredLabel(label=item, score=max(0.1, 1.0 - i * step))
        for i, item in enumerate(items)
    ]


def assemble_dashboard(
    project_id: str,
    scenario_id: str,
    personas: list[Persona],
    round1_responses: list[PersonaResponse],
    round2_responses: list[PersonaResponse],
    moderator_question: ModeratorQuestion,
    analyst_summary: AnalystSummary,
    tribe_result: TribeResult | None = None,
) -> DashboardPayload:
    likelihoods = [float(r.adoption_likelihood_0_100) for r in round2_responses]

    return DashboardPayload(
        project_id=project_id,
        scenario_id=scenario_id,
        consensus_score=compute_consensus_score(likelihoods),
        disagreement_score=compute_disagreement_score(round2_responses),
        evidence_coverage=compute_evidence_coverage(round2_responses),
        top_risks=_scored_labels(analyst_summary.top_risks),
        top_wins=_scored_labels(analyst_summary.top_wins),
        feature_scores=aggregate_feature_scores(round2_responses),
        personas=build_persona_summaries(personas, round2_responses),
        quotes=extract_quotes(round2_responses, personas),
        round1_responses=round1_responses,
        round2_responses=round2_responses,
        moderator_question=moderator_question.follow_up_question,
        analyst_summary=analyst_summary,
        tribe=tribe_result,
    )
