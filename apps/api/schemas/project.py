from __future__ import annotations

from pydantic import BaseModel

from apps.api.schemas.dashboard import DashboardPayload


class Project(BaseModel):
    project_id: str
    name: str
    status: str
    created_at: str
    source_count: int
    chunk_count: int
    dashboard: DashboardPayload | None
