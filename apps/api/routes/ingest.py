from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(tags=["ingest"])


class IngestRequest(BaseModel):
    sources: list[str]


@router.post("/projects/{project_id}/ingest")
async def ingest(project_id: str, body: IngestRequest, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")

    import config as _config
    settings = _config.get_settings()

    if settings.USE_MOCK_RETRIEVAL:
        from core.simulation.mock_corpus import DEMO_CHUNKS
        chunk_count = len(DEMO_CHUNKS)
    else:
        chunk_count = len(body.sources) * 10

    updated = project.model_copy(update={
        "source_count": len(body.sources),
        "chunk_count": chunk_count,
        "status": "ingested",
    })
    request.app.state.projects[project_id] = updated

    return {"source_count": updated.source_count, "chunk_count": updated.chunk_count}
