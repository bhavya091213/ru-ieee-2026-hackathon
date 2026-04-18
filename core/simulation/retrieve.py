from __future__ import annotations

import logging

from apps.api.schemas.persona import Persona
from apps.api.schemas.retrieval import RetrievalResult
from apps.api.schemas.scenario import Scenario

logger = logging.getLogger(__name__)


async def retrieve_for_persona(
    persona: Persona,
    scenario: Scenario,
    project_id: str,
    top_k: int = 10,
) -> list[RetrievalResult]:
    import config as _config

    settings = _config.get_settings()

    if not settings.USE_MOCK_RETRIEVAL:
        from core.ws1.retrieval import retrieve  # type: ignore[import-not-found]

        raw = await retrieve(
            query=f"{persona.segment_label} {scenario.product_name}",
            facets=list(persona.feature_priorities.keys()),
            top_k=top_k,
        )
        return [RetrievalResult(**r) for r in raw]

    from core.simulation.mock_corpus import mock_retrieve

    query_facets = list(persona.feature_priorities.keys())
    if not query_facets:
        query_facets = scenario.facets_to_explore

    raw_chunks = mock_retrieve(query_facets=query_facets, top_k=top_k)

    return [
        RetrievalResult(
            chunk_id=c["chunk_id"],
            text=c["text"],
            facet=c["facet"],
            stance=c["stance"],
            community_id=c["community_id"],
        )
        for c in raw_chunks
    ]
