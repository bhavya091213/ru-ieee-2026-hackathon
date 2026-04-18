from __future__ import annotations

import json
import logging

from apps.api.schemas.simulation import ModeratorQuestion, PersonaResponse
from core.gemini import generate_structured
from core.simulation.prompts import MODERATOR_PROMPT

logger = logging.getLogger(__name__)


async def analyze_disagreement(
    round1_responses: list[PersonaResponse],
    chunk_summaries: list[str],
) -> ModeratorQuestion:
    responses_json = json.dumps(
        [r.model_dump() for r in round1_responses], indent=2
    )
    summaries_text = "\n".join(f"- {s}" for s in chunk_summaries)

    prompt = MODERATOR_PROMPT.format(
        round1_responses_json=responses_json,
        chunk_summaries=summaries_text,
    )

    result = await generate_structured(
        prompt=prompt,
        response_schema=ModeratorQuestion,
        temperature=0.0,
    )

    valid_ids = {r.persona_id for r in round1_responses}
    filtered = [pid for pid in result.targeted_persona_ids if pid in valid_ids]
    invalid = set(result.targeted_persona_ids) - set(filtered)
    for pid in invalid:
        logger.warning("Stripped invalid targeted_persona_id '%s'", pid)

    if filtered != result.targeted_persona_ids:
        result = result.model_copy(update={"targeted_persona_ids": filtered})

    return result
