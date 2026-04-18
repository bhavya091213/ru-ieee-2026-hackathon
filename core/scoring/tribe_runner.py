from __future__ import annotations

from apps.api.schemas.dashboard import TribeResult
from apps.api.schemas.scenario import Scenario
from apps.api.schemas.simulation import PersonaResponse
from core.scoring.heuristics import response_spread, response_strength, response_variance


def _build_scored_text(strength: float, variance: float, spread: float) -> str:
    parts: list[str] = []

    if strength < 0.3:
        parts.append("Personas showed mild reactions to this concept -- the product does not provoke strong feelings.")
    elif strength <= 0.6:
        parts.append("Personas showed moderate reactions -- the product generates meaningful engagement.")
    else:
        parts.append("Personas showed strong reactions -- this concept provokes intense feelings (positive or negative).")

    if variance < 0.3:
        parts.append("The panel largely agrees on their overall assessment.")
    elif variance <= 0.6:
        parts.append("There is notable disagreement between personas on the overall product appeal.")
    else:
        parts.append("Strong polarization detected -- personas have very different reactions to this concept.")

    if spread < 0.3:
        parts.append("Feature-level opinions are relatively aligned across the panel.")
    elif spread <= 0.6:
        parts.append("Some features show divergent opinions -- consider targeted messaging.")
    else:
        parts.append("Features are highly polarizing -- different segments value very different aspects.")

    return " ".join(parts)


async def score_tribe(
    round2_responses: list[PersonaResponse],
    scenario: Scenario,
) -> TribeResult:
    if not round2_responses:
        return TribeResult(
            enabled=True,
            response_strength=0.0,
            response_variance=0.0,
            response_spread=0.0,
            scored_text="No responses to score.",
        )

    strength = response_strength(round2_responses)
    variance = response_variance(round2_responses)
    spread = response_spread(round2_responses)
    scored_text = _build_scored_text(strength, variance, spread)

    return TribeResult(
        enabled=True,
        response_strength=strength,
        response_variance=variance,
        response_spread=spread,
        scored_text=scored_text,
    )
