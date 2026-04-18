from __future__ import annotations

import json

from apps.api.schemas.simulation import AnalystSummary, ModeratorQuestion, PersonaResponse
from core.gemini import generate_structured
from core.simulation.prompts import ANALYST_PROMPT


async def synthesize_results(
    round1: list[PersonaResponse],
    round2: list[PersonaResponse],
    moderator_question: ModeratorQuestion,
) -> AnalystSummary:
    prompt = ANALYST_PROMPT.format(
        round1_json=json.dumps([r.model_dump() for r in round1], indent=2),
        round2_json=json.dumps([r.model_dump() for r in round2], indent=2),
        moderator_question_json=moderator_question.model_dump_json(indent=2),
    )

    return await generate_structured(
        prompt=prompt,
        response_schema=AnalystSummary,
        temperature=0.0,
    )
