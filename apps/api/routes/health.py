from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    import config as _config

    settings = _config.get_settings()
    return {
        "status": "ok",
        "gemini_configured": bool(settings.GEMINI_API_KEY),
    }
