from __future__ import annotations

import statistics

from apps.api.schemas.simulation import PersonaResponse


def response_strength(responses: list[PersonaResponse]) -> float:
    if not responses:
        return 0.0
    deviations = [abs(r.adoption_likelihood_0_100 - 50) for r in responses]
    return statistics.mean(deviations) / 50


def response_variance(responses: list[PersonaResponse]) -> float:
    if len(responses) < 2:
        return 0.0
    likelihoods = [float(r.adoption_likelihood_0_100) for r in responses]
    stddev = statistics.pstdev(likelihoods)
    return min(stddev / 50, 1.0)


def response_spread(responses: list[PersonaResponse]) -> float:
    if len(responses) < 2:
        return 0.0

    facet_values: dict[str, list[float]] = {}
    for r in responses:
        for facet, score in r.feature_scores.items():
            facet_values.setdefault(facet, []).append(score)

    ranges: list[float] = []
    for scores in facet_values.values():
        if len(scores) >= 2:
            ranges.append(max(scores) - min(scores))

    if not ranges:
        return 0.0
    return min(statistics.mean(ranges), 1.0)
