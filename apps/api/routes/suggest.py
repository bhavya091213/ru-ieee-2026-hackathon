from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["suggest"])


class SuggestFacetsRequest(BaseModel):
    product_name: str
    description: str = ""
    seed_urls: list[str] = []


class SuggestFacetsResponse(BaseModel):
    facets: list[str]


@router.post("/suggest-facets", response_model=SuggestFacetsResponse)
async def suggest_facets(body: SuggestFacetsRequest):
    import asyncio

    import config as _config
    from google import genai

    settings = _config.get_settings()
    if not settings.GEMINI_API_KEY:
        raise HTTPException(500, detail="GEMINI_API_KEY not configured")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    urls_context = ""
    if body.seed_urls:
        urls_context = f"\nSeed URLs provided: {', '.join(body.seed_urls[:5])}"

    prompt = f"""You are a product research analyst. Given a product, suggest 5-8 key facets (topic areas) that consumers care about when evaluating this product.

Product: {body.product_name}
Description: {body.description or 'N/A'}{urls_context}

Return a JSON object with a single key "facets" containing a list of short, lowercase facet keywords (1-2 words each). These should be the most important dimensions consumers evaluate for this specific product category.

Examples of facets for a smartphone: camera, battery, price, display, performance, design, software, durability
Examples of facets for a laptop: performance, display, keyboard, battery, price, portability, build quality
Examples of facets for headphones: sound quality, comfort, noise cancellation, battery, price, connectivity

Return facets specific to this product. Be precise and relevant."""

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
            ),
        )

        data = json.loads(response.text)
        facets = data.get("facets", [])
        facets = [f.lower().strip() for f in facets if isinstance(f, str) and f.strip()]
        return SuggestFacetsResponse(facets=facets[:8])

    except Exception as exc:
        raise HTTPException(500, detail=f"Facet suggestion failed: {str(exc)[:200]}")
