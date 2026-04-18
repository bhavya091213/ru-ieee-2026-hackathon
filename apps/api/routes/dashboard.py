from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(tags=["dashboard"])


@router.get("/projects/{project_id}/dashboard")
async def get_dashboard(project_id: str, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")
    if project.dashboard is None:
        raise HTTPException(404, detail="No simulation results available")
    return project.dashboard
