from __future__ import annotations

import asyncio
import logging
import os
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ingest"])


class IngestRequest(BaseModel):
    sources: list[str]
    product_name: str = ""


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_") or "product"


async def _ingest_sources(
    sources: list[str],
    canonical_product: str,
    data_dir: str,
) -> dict:
    from core.indexing.chroma_store import VectorStore
    from core.indexing.chunk import chunk_documents
    from core.indexing.embed import GeminiEmbedder
    from core.ingest.fetch import fetch_url
    from core.ingest.md_writer import write_markdown

    os.makedirs(f"{data_dir}/raw", exist_ok=True)
    os.makedirs(f"{data_dir}/md", exist_ok=True)
    os.makedirs(f"{data_dir}/chunks", exist_ok=True)

    doc_count = 0
    for url in sources:
        url = url.strip()
        if not url:
            continue

        source_type = "web_article"
        if "reddit.com" in url:
            source_type = "reddit_post"
        elif "youtube.com" in url or "youtu.be" in url:
            source_type = "youtube"

        if source_type == "youtube":
            try:
                from core.ingest.youtube import fetch_youtube

                results = await asyncio.to_thread(fetch_youtube, [url], f"{data_dir}/raw")
                for r in results:
                    write_markdown(
                        text=r["text"],
                        metadata={
                            "title": r.get("title", "YouTube Video"),
                            "author": "YouTube",
                            "published_at": r.get("date", "unknown"),
                            "source_url": r.get("url", url),
                        },
                        canonical_product=canonical_product,
                        output_dir=data_dir,
                        source_type="youtube",
                    )
                    doc_count += 1
            except Exception as exc:
                logger.warning("YouTube fetch failed for %s: %s", url, exc)
        elif source_type == "reddit_post":
            try:
                from core.ingest.reddit import fetch_reddit

                subreddit = "all"
                parts = url.split("/r/")
                if len(parts) > 1:
                    subreddit = parts[1].split("/")[0]

                results = await asyncio.to_thread(
                    fetch_reddit, subreddit, canonical_product, 10, f"{data_dir}/raw"
                )
                for r in results:
                    write_markdown(
                        text=r.get("text", ""),
                        metadata={
                            "title": r.get("title", r.get("parent_post_title", "")),
                            "author": r.get("author", "anonymous"),
                            "published_at": r.get("date", "unknown"),
                            "source_url": r.get("url", url),
                        },
                        canonical_product=canonical_product,
                        output_dir=data_dir,
                        source_type=r.get("source_type", "reddit_post"),
                    )
                    doc_count += 1
            except Exception as exc:
                logger.warning("Reddit fetch failed for %s: %s", url, exc)
        else:
            try:
                raw_doc = await asyncio.to_thread(fetch_url, url, canonical_product)
                if raw_doc:
                    write_markdown(
                        text=raw_doc.text,
                        metadata={
                            "title": raw_doc.title,
                            "author": raw_doc.author or "unknown",
                            "published_at": raw_doc.date or "unknown",
                            "source_url": raw_doc.url,
                        },
                        canonical_product=canonical_product,
                        output_dir=data_dir,
                        source_type="web_article",
                    )
                    doc_count += 1
            except Exception as exc:
                logger.warning("Web fetch failed for %s: %s", url, exc)

    md_dir = f"{data_dir}/md"
    chunks_path = f"{data_dir}/chunks/{canonical_product}.jsonl"
    chunks = await asyncio.to_thread(
        chunk_documents, md_dir, chunks_path, canonical_product
    )

    if chunks:
        import config as _config

        settings = _config.get_settings()
        embedder = GeminiEmbedder(api_key=settings.GEMINI_API_KEY)
        store = VectorStore(
            embedder=embedder,
            persist_dir=f"{data_dir}/chroma",
            collection_name=canonical_product,
        )
        await asyncio.to_thread(store.add_chunks, chunks)

    return {"source_count": doc_count, "chunk_count": len(chunks)}


@router.post("/projects/{project_id}/ingest")
async def ingest(project_id: str, body: IngestRequest, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")

    canonical = _slugify(body.product_name or project.name)
    data_dir = str(Path("data"))

    result = await _ingest_sources(body.sources, canonical, data_dir)

    updated = project.model_copy(update={
        "source_count": result["source_count"],
        "chunk_count": result["chunk_count"],
        "status": "ingested",
    })
    request.app.state.projects[project_id] = updated

    if not hasattr(request.app.state, "project_products"):
        request.app.state.project_products = {}
    request.app.state.project_products[project_id] = canonical

    return {"source_count": result["source_count"], "chunk_count": result["chunk_count"]}
