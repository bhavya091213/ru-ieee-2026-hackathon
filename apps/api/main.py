from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.routes.dashboard import router as dashboard_router
from apps.api.routes.health import router as health_router
from apps.api.routes.ingest import router as ingest_router
from apps.api.routes.projects import router as projects_router
from apps.api.routes.simulate import router as simulate_router
from apps.api.routes.tribe import router as tribe_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    import config as _config
    settings = _config.get_settings()

    app.state.projects = {}
    app.state.sim_status = {}
    app.state.running_sims = set()
    app.state.tasks = {}

    yield

    app.state.projects.clear()
    app.state.sim_status.clear()
    app.state.running_sims.clear()


def create_app() -> FastAPI:
    app = FastAPI(
        title="PanelForge",
        version="0.1.0",
        description="AI-powered synthetic focus group simulator",
        lifespan=lifespan,
    )

    import config as _config
    settings = _config.get_settings()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(projects_router, prefix="/api")
    app.include_router(ingest_router, prefix="/api")
    app.include_router(simulate_router, prefix="/api")
    app.include_router(dashboard_router, prefix="/api")
    app.include_router(tribe_router, prefix="/api")

    return app


app = create_app()
