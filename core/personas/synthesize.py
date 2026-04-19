from __future__ import annotations

import asyncio
import json
import logging

from apps.api.schemas.persona import Persona
from core.gemini import generate_structured
from core.personas.cluster import ClusterResult
from core.personas.prompts import PERSONA_SYNTHESIS_PROMPT

logger = logging.getLogger(__name__)


def _validate_persona(persona: Persona, cluster: ClusterResult) -> Persona:
    filtered_beliefs = [
        b for b in persona.beliefs if len(b.evidence_chunk_ids) >= 2
    ]

    if len(filtered_beliefs) < 3:
        logger.warning(
            "Persona '%s' has only %d beliefs after filtering (minimum recommended: 3)",
            persona.segment_label,
            len(filtered_beliefs),
        )

    valid_priorities = {k.strip().lower(): v for k, v in persona.feature_priorities.items()}

    entity_ids = list({eid for eid in cluster.entity_ids}) if cluster.entity_ids else persona.graph_entity_ids

    return persona.model_copy(
        update={
            "beliefs": filtered_beliefs,
            "feature_priorities": valid_priorities,
            "graph_entity_ids": entity_ids,
        }
    )


async def _synthesize_one(cluster: ClusterResult) -> Persona:
    chunk_data = [
        {"chunk_id": cid, "text": text}
        for cid, text in zip(cluster.chunk_ids, cluster.chunk_texts)
    ]

    prompt = PERSONA_SYNTHESIS_PROMPT.format(
        cluster_id=cluster.cluster_id,
        chunks=json.dumps(chunk_data, indent=2),
        entities=json.dumps(cluster.entity_ids),
        facets=", ".join(cluster.facets),
        stances=", ".join(cluster.stances),
    )

    persona = await generate_structured(
        prompt=prompt,
        response_schema=Persona,
        temperature=0.0,
    )

    return persona.model_copy(update={"graph_entity_ids": cluster.entity_ids})


async def synthesize_personas(
    clusters: list[ClusterResult],
) -> list[Persona]:
    if not clusters:
        return []

    logger.info("Starting synthesis for %d clusters", len(clusters))

    results: list[Persona] = []
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(_synthesize_one(c)) for c in clusters]

    raw_personas = [t.result() for t in tasks]

    for persona, cluster in zip(raw_personas, clusters):
        validated = _validate_persona(persona, cluster)
        logger.info(
            "Completed synthesis for cluster %d -> persona '%s'",
            cluster.cluster_id,
            validated.segment_label,
        )
        results.append(validated)

    logger.info("All %d personas synthesized successfully", len(results))
    return results
