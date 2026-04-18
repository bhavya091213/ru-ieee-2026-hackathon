from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(tags=["tribe"])


@router.post("/projects/{project_id}/tribe/score")
async def tribe_score(project_id: str, request: Request):
    import config as _config
    settings = _config.get_settings()

    if not settings.TRIBE_ENABLED:
        raise HTTPException(400, detail="TRIBE scoring is disabled")

    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")

    if project.dashboard is None:
        raise HTTPException(404, detail="No simulation results available")

    from core.scoring.tribe_runner import score_tribe

    result = await score_tribe(project.dashboard.round2_responses, None)
    return result
