from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from apps.api.schemas.project import Project

router = APIRouter(tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""


@router.post("/projects", status_code=201)
async def create_project(body: CreateProjectRequest, request: Request):
    project_id = str(uuid.uuid4())
    project = Project(
        project_id=project_id,
        name=body.name,
        status="created",
        created_at=datetime.now(timezone.utc).isoformat(),
        source_count=0,
        chunk_count=0,
        dashboard=None,
    )
    request.app.state.projects[project_id] = project
    return {"project_id": project_id}


@router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")
    return project
