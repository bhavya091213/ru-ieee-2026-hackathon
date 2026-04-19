from __future__ import annotations

import asyncio
import json
import logging
from typing import Callable

from apps.api.schemas.persona import Persona
from apps.api.schemas.simulation import PersonaResponse
from core.gemini import generate_structured
from core.simulation.orchestrator import SimPhase, SimulationState
from core.simulation.prompts import PANEL_RESPONSE_PROMPT
from core.simulation.retrieve import retrieve_for_persona

logger = logging.getLogger(__name__)

_SEMAPHORE_LIMIT = 5


def validate_grounding(
    response: PersonaResponse,
    valid_chunk_ids: set[str],
) -> tuple[PersonaResponse, bool]:
    cleaned = [cid for cid in response.cited_chunk_ids if cid in valid_chunk_ids]
    stripped = set(response.cited_chunk_ids) - set(cleaned)
    for cid in stripped:
        logger.warning("Stripped invalid chunk_id '%s' from persona '%s'", cid, response.persona_id)

    low_grounding = len(cleaned) == 0
    new_response = response.model_copy(update={"cited_chunk_ids": cleaned})
    return new_response, low_grounding


def _get_valid_chunk_ids(
    persona_label: str,
    retrieved_evidence: dict[str, list],
) -> set[str]:
    evidence = retrieved_evidence.get(persona_label, [])
    return {r.chunk_id if hasattr(r, "chunk_id") else r["chunk_id"] for r in evidence}


def _build_round1_prompt(
    persona: Persona,
    scenario,
    evidence: list,
) -> str:
    evidence_text = "\n".join(
        f"[{r.chunk_id if hasattr(r, 'chunk_id') else r['chunk_id']}]: "
        f"\"{r.text if hasattr(r, 'text') else r['text']}\""
        for r in evidence
    )
    facets = ", ".join(scenario.facets_to_explore) if scenario.facets_to_explore else "general"
    return PANEL_RESPONSE_PROMPT.format(
        segment_label=persona.segment_label,
        product_name=scenario.product_name,
        description=scenario.description,
        hypotheses=json.dumps(scenario.hypotheses),
        persona_json=persona.model_dump_json(indent=2),
        evidence_chunks=evidence_text,
        discussion_context="",
        facets=facets,
    )


def _build_round2_prompt(
    persona: Persona,
    scenario,
    evidence: list,
    round1_responses: list[PersonaResponse],
    moderator_question,
) -> str:
    evidence_text = "\n".join(
        f"[{r.chunk_id if hasattr(r, 'chunk_id') else r['chunk_id']}]: "
        f"\"{r.text if hasattr(r, 'text') else r['text']}\""
        for r in evidence
    )

    round1_summary = "\n".join(
        f"- {r.persona_id} ({r.strongest_positive} vs {r.strongest_concern}): "
        f"adoption={r.adoption_likelihood_0_100}, reaction: {r.overall_reaction}"
        for r in round1_responses
    )

    discussion = (
        f"Discussion from Round 1:\n{round1_summary}\n\n"
        f"Moderator asks: {moderator_question.follow_up_question}\n"
        f"(Disagreement context: {moderator_question.disagreement_summary})\n\n"
        "You have now heard other panelists' perspectives and a moderator follow-up question. "
        "Update your position if the evidence warrants it. Explain what changed and why."
    )

    facets = ", ".join(scenario.facets_to_explore) if scenario.facets_to_explore else "general"
    return PANEL_RESPONSE_PROMPT.format(
        segment_label=persona.segment_label,
        product_name=scenario.product_name,
        description=scenario.description,
        hypotheses=json.dumps(scenario.hypotheses),
        persona_json=persona.model_dump_json(indent=2),
        evidence_chunks=evidence_text,
        discussion_context=discussion,
        facets=facets,
    )


async def _fan_out_persona_calls(
    personas: list[Persona],
    build_prompt: Callable[[Persona], str],
    semaphore: asyncio.Semaphore,
    temperature: float = 0.2,
    facet_list: list[str] | None = None,
) -> list[PersonaResponse]:
    schema_hints: dict[str, dict] | None = None
    if facet_list:
        schema_hints = {
            "feature_scores": {
                "title": "Feature Scores",
                "type": "object",
                "properties": {
                    f: {"type": "number"} for f in facet_list
                },
                "required": list(facet_list),
            }
        }

    results: list[PersonaResponse] = [None] * len(personas)  # type: ignore[list-item]

    async def _call(idx: int, persona: Persona) -> None:
        async with semaphore:
            prompt = build_prompt(persona)
            resp = await generate_structured(
                prompt=prompt,
                response_schema=PersonaResponse,
                temperature=temperature,
                schema_hints=schema_hints,
            )
            results[idx] = resp

    async with asyncio.TaskGroup() as tg:
        for i, p in enumerate(personas):
            tg.create_task(_call(i, p))

    return results


async def retrieve_phase(state: SimulationState) -> SimulationState:
    semaphore = asyncio.Semaphore(_SEMAPHORE_LIMIT)
    evidence_dict: dict[str, list] = {}

    async def _fetch(persona: Persona) -> None:
        async with semaphore:
            results = await retrieve_for_persona(
                persona, state.scenario, state.project_id
            )
            evidence_dict[persona.segment_label] = results

    try:
        async with asyncio.TaskGroup() as tg:
            for p in state.personas:
                tg.create_task(_fetch(p))
    except Exception as exc:
        return state.transition(phase=SimPhase.FAILED, error=str(exc))

    return state.transition(
        retrieved_evidence=evidence_dict,
        phase=SimPhase.ROUND1,
    )


async def round1_phase(state: SimulationState) -> SimulationState:
    semaphore = asyncio.Semaphore(_SEMAPHORE_LIMIT)

    def build_prompt(persona: Persona) -> str:
        evidence = state.retrieved_evidence.get(persona.segment_label, [])
        return _build_round1_prompt(persona, state.scenario, evidence)

    facets = state.scenario.facets_to_explore or None

    try:
        responses = await _fan_out_persona_calls(
            state.personas, build_prompt, semaphore, temperature=0.2,
            facet_list=facets,
        )
    except Exception as exc:
        return state.transition(phase=SimPhase.FAILED, error=str(exc))

    cleaned: list[PersonaResponse] = []
    low_grounding_ids: list[str] = []
    for resp, persona in zip(responses, state.personas):
        valid_ids = _get_valid_chunk_ids(persona.segment_label, state.retrieved_evidence)
        clean_resp, is_low = validate_grounding(resp, valid_ids)
        cleaned.append(clean_resp)
        if is_low:
            low_grounding_ids.append(resp.persona_id)

    metadata = {**state.metadata, "low_grounding_round1": low_grounding_ids}
    return state.transition(
        round1_responses=cleaned,
        phase=SimPhase.MODERATING,
        metadata=metadata,
    )


async def round2_phase(state: SimulationState) -> SimulationState:
    semaphore = asyncio.Semaphore(_SEMAPHORE_LIMIT)

    def build_prompt(persona: Persona) -> str:
        evidence = state.retrieved_evidence.get(persona.segment_label, [])
        return _build_round2_prompt(
            persona, state.scenario, evidence,
            state.round1_responses, state.moderator_question,
        )

    facets = state.scenario.facets_to_explore or None

    try:
        responses = await _fan_out_persona_calls(
            state.personas, build_prompt, semaphore, temperature=0.2,
            facet_list=facets,
        )
    except Exception as exc:
        return state.transition(phase=SimPhase.FAILED, error=str(exc))

    cleaned: list[PersonaResponse] = []
    low_grounding_ids: list[str] = []
    for resp, persona in zip(responses, state.personas):
        valid_ids = _get_valid_chunk_ids(persona.segment_label, state.retrieved_evidence)
        clean_resp, is_low = validate_grounding(resp, valid_ids)
        cleaned.append(clean_resp)
        if is_low:
            low_grounding_ids.append(resp.persona_id)

    metadata = {**state.metadata, "low_grounding_round2": low_grounding_ids}
    return state.transition(
        round2_responses=cleaned,
        phase=SimPhase.ANALYZING,
        metadata=metadata,
    )
