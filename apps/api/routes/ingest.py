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


def _progress(app_state, project_id: str, msg: str) -> None:
    logs: list = getattr(app_state, "progress_logs", None) or {}
    if isinstance(logs, dict):
        logs.setdefault(project_id, []).append(msg)


async def _ingest_sources(
    sources: list[str],
    canonical_product: str,
    data_dir: str,
    app_state=None,
    project_id: str = "",
) -> dict:
    from core.indexing.chroma_store import VectorStore
    from core.indexing.chunk import chunk_documents
    from core.indexing.embed import GeminiEmbedder
    from core.ingest.fetch import fetch_url
    from core.ingest.md_writer import write_markdown

    os.makedirs(f"{data_dir}/raw", exist_ok=True)
    os.makedirs(f"{data_dir}/md", exist_ok=True)
    os.makedirs(f"{data_dir}/chunks", exist_ok=True)

    if not sources or all(not u.strip() for u in sources):
        import urllib.parse

        import requests

        product_query = canonical_product.replace("_", " ")
        sources = []

        try:
            wiki_resp = requests.get(
                "https://en.wikipedia.org/w/api.php",
                params={"action": "opensearch", "search": product_query, "limit": 3, "format": "json"},
                headers={"User-Agent": "PanelForge/0.1"},
                timeout=10,
            )
            if wiki_resp.ok:
                data = wiki_resp.json()
                urls = data[3] if len(data) > 3 else []
                sources.extend(urls[:2])
        except Exception as exc:
            logger.warning("Wikipedia search failed: %s", exc)

        if not sources:
            wiki_slug = urllib.parse.quote(product_query.title().replace(" ", "_"))
            sources = [f"https://en.wikipedia.org/wiki/{wiki_slug}"]

        logger.info("No URLs provided — auto-found: %s", sources)

    def log(msg: str) -> None:
        _progress(app_state, project_id, msg)
        logger.info(msg)

    log(f"Starting ingest for \"{canonical_product}\" — {len(sources)} source(s)")

    has_reddit = any("reddit.com" in u for u in sources)
    if not has_reddit:
        product_query = canonical_product.replace("_", " ")
        auto_reddit = f"https://www.reddit.com/r/all/search?q={product_query}"
        sources.append(auto_reddit)
        log(f"Auto-added Reddit search for \"{product_query}\"")

    doc_count = 0
    for idx, url in enumerate(sources):
        url = url.strip()
        if not url:
            continue

        source_type = "web_article"
        if "reddit.com" in url:
            source_type = "reddit_post"
        elif "youtube.com" in url or "youtu.be" in url:
            source_type = "youtube"

        label = f"[{idx + 1}/{len(sources)}]"

        if source_type == "youtube":
            try:
                from core.ingest.youtube import fetch_youtube

                log(f"{label} Fetching YouTube transcript...")
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
                log(f"{label} YouTube: got {len(results)} transcript(s)")
            except Exception as exc:
                log(f"{label} YouTube fetch failed: {exc}")
        elif source_type == "reddit_post":
            try:
                from core.ingest.reddit import fetch_reddit

                subreddit = "all"
                parts = url.split("/r/")
                if len(parts) > 1:
                    subreddit = parts[1].split("/")[0]

                log(f"{label} Scraping r/{subreddit}...")
                results = await asyncio.to_thread(
                    fetch_reddit, subreddit, canonical_product, 25, f"{data_dir}/raw"
                )
                posts = [r for r in results if r.get("source_type") == "reddit_post"]
                comments = [r for r in results if r.get("source_type") == "reddit_comment"]
                log(f"{label} Found {len(posts)} posts, {len(comments)} comments in r/{subreddit}")

                written = 0
                for r in results:
                    text = r.get("text", "")
                    if not text or not text.strip():
                        continue
                    write_markdown(
                        text=text,
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
                    written += 1
                log(f"{label} Saved {written} documents from Reddit")
            except Exception as exc:
                log(f"{label} Reddit fetch failed: {exc}")
                logger.error("Reddit fetch FAILED for %s: %s", url, exc, exc_info=True)
        else:
            try:
                log(f"{label} Fetching web article...")
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
                    log(f"{label} Saved \"{raw_doc.title[:60]}\"")
                else:
                    log(f"{label} No content extracted from {url}")
            except Exception as exc:
                log(f"{label} Web fetch failed: {exc}")

    log(f"Fetching complete — {doc_count} documents total")

    md_dir = f"{data_dir}/md"
    chunks_path = f"{data_dir}/chunks/{canonical_product}.jsonl"

    log("Chunking documents into ~500-word segments...")
    chunks = await asyncio.to_thread(
        chunk_documents, md_dir, chunks_path, canonical_product
    )
    log(f"Created {len(chunks)} chunks")

    if not chunks:
        log("No chunks produced — check that seed URLs contain relevant content")
        return {"source_count": doc_count, "chunk_count": 0}

    from core.indexing.local_enrich import build_pseudo_graph, enrich_chunks

    log("Classifying facets and stances...")
    chunks = enrich_chunks(chunks)
    facet_counts = {}
    for c in chunks:
        f = c.get("facet", "other")
        facet_counts[f] = facet_counts.get(f, 0) + 1
    top_facets = sorted(facet_counts, key=facet_counts.get, reverse=True)[:5]  # type: ignore[arg-type]
    log(f"Top facets: {', '.join(f'{f} ({facet_counts[f]})' for f in top_facets)}")

    import config as _config

    settings = _config.get_settings()

    log(f"Generating embeddings for {len(chunks)} chunks...")
    embedder = GeminiEmbedder(api_key=settings.GEMINI_API_KEY)
    store = VectorStore(
        embedder=embedder,
        persist_dir=f"{data_dir}/chroma",
        collection_name=canonical_product,
    )
    await asyncio.to_thread(store.add_chunks, chunks)
    log(f"Stored {len(chunks)} vectors in ChromaDB")

    log("Building topic graph...")
    graph_stats = await asyncio.to_thread(build_pseudo_graph, chunks, data_dir)
    entity_count = graph_stats["entity_count"]
    community_count = graph_stats["community_count"]
    log(f"Graph: {entity_count} entities, {community_count} communities")

    log("Ingest complete")
    return {
        "source_count": doc_count,
        "chunk_count": len(chunks),
        "entity_count": entity_count,
        "community_count": community_count,
    }


@router.post("/projects/{project_id}/ingest")
async def ingest(project_id: str, body: IngestRequest, request: Request):
    project = request.app.state.projects.get(project_id)
    if project is None:
        raise HTTPException(404, detail="Project not found")

    canonical = _slugify(body.product_name or project.name)
    data_dir = str(Path("data") / "projects" / project_id)

    if not hasattr(request.app.state, "progress_logs"):
        request.app.state.progress_logs = {}
    request.app.state.progress_logs[project_id] = []

    try:
        result = await _ingest_sources(
            body.sources, canonical, data_dir,
            app_state=request.app.state, project_id=project_id,
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, detail=f"Ingest failed: {str(exc)[:200]}")

    updated = project.model_copy(update={
        "source_count": result["source_count"],
        "chunk_count": result["chunk_count"],
        "status": "ingested",
    })
    request.app.state.projects[project_id] = updated

    if not hasattr(request.app.state, "project_products"):
        request.app.state.project_products = {}
    request.app.state.project_products[project_id] = canonical

    return result
