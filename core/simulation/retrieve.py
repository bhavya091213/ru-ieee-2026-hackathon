from __future__ import annotations

import logging
from pathlib import Path

from apps.api.schemas.persona import Persona
from apps.api.schemas.retrieval import RetrievalResult
from apps.api.schemas.scenario import Scenario

logger = logging.getLogger(__name__)


async def retrieve_for_persona(
    persona: Persona,
    scenario: Scenario,
    project_id: str,
    top_k: int = 10,
    collection_name: str | None = None,
) -> list[RetrievalResult]:
    import asyncio

    import config as _config
    from core.indexing.chroma_store import VectorStore
    from core.indexing.embed import GeminiEmbedder

    settings = _config.get_settings()

    data_dir = str(Path("data"))
    persist_dir = f"{data_dir}/chroma"

    coll_name = collection_name or _guess_collection(persist_dir)
    if not coll_name:
        logger.warning("No ChromaDB collection found, returning empty results")
        return []

    embedder = GeminiEmbedder(api_key=settings.GEMINI_API_KEY)
    store = VectorStore(
        embedder=embedder,
        persist_dir=persist_dir,
        collection_name=coll_name,
    )

    query_parts = [persona.segment_label, scenario.product_name]
    top_facets = sorted(
        persona.feature_priorities.items(), key=lambda x: x[1], reverse=True
    )
    for facet, _ in top_facets[:3]:
        query_parts.append(facet)
    for belief in persona.beliefs[:2]:
        query_parts.append(belief.claim)

    query = " ".join(query_parts)

    raw_results = await asyncio.to_thread(store.search, query, top_k)

    results: list[RetrievalResult] = []
    for r in raw_results:
        meta = r.get("metadata", {})
        results.append(
            RetrievalResult(
                chunk_id=r["chunk_id"],
                text=r["text"],
                facet=meta.get("facet", meta.get("metadata_source_type", "other")),
                stance=meta.get("stance", "review"),
                community_id=meta.get("community_id", meta.get("doc_id", "unknown")),
            )
        )

    logger.info(
        "Retrieved %d chunks for persona '%s' from collection '%s'",
        len(results),
        persona.segment_label,
        coll_name,
    )
    return results


def _guess_collection(persist_dir: str) -> str | None:
    try:
        import chromadb
        from chromadb.config import Settings

        client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        collections = client.list_collections()
        if collections:
            return collections[0].name
    except Exception:
        pass
    return None
