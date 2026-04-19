from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(tags=["explore"])


def _data_dir() -> Path:
    return Path("data")


def _project_dir(project_id: str) -> Path:
    return Path("data") / "projects" / project_id


@router.get("/projects/{project_id}/explore/documents")
async def list_project_documents(project_id: str):
    md_dir = _project_dir(project_id) / "md"
    if not md_dir.exists():
        return {"documents": []}

    docs: list[dict] = []
    for f in sorted(md_dir.glob("*.md")):
        content = f.read_text()
        lines = content.split("\n")
        title = f.stem
        source_url = ""
        source_type = "unknown"
        for line in lines[:20]:
            if line.startswith("title:"):
                title = line.split(":", 1)[1].strip().strip("'\"")
            if line.startswith("source_url:"):
                source_url = line.split(":", 1)[1].strip().strip("'\"")
            if line.startswith("source_type:"):
                source_type = line.split(":", 1)[1].strip().strip("'\"")

        docs.append({
            "filename": f.name,
            "title": title,
            "source_url": source_url,
            "source_type": source_type,
            "size_bytes": f.stat().st_size,
            "preview": content[:300],
        })

    return {"documents": docs}


@router.get("/projects/{project_id}/explore/chunks")
async def list_project_chunks(
    project_id: str,
    facet: str = Query(default="", description="Filter by facet"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    chunks_dir = _project_dir(project_id) / "chunks"
    if not chunks_dir.exists():
        return {"chunks": [], "total": 0}

    all_chunks: list[dict] = []
    for f in sorted(chunks_dir.glob("*.jsonl")):
        if f.stem.endswith("_enriched"):
            continue
        for line in f.read_text().splitlines():
            if not line.strip():
                continue
            try:
                chunk = json.loads(line)
                meta = chunk.get("metadata", {})
                chunk_facet = meta.get("facet", meta.get("source_type", "unknown"))
                chunk_stance = meta.get("stance", "unknown")
                if facet and chunk_facet != facet:
                    continue
                all_chunks.append({
                    "chunk_id": chunk.get("chunk_id", ""),
                    "doc_id": chunk.get("doc_id", ""),
                    "text": chunk.get("text", "")[:500],
                    "section_title": chunk.get("section_title"),
                    "facet": chunk_facet,
                    "stance": chunk_stance,
                    "evidence_score": chunk.get("evidence_score", 0),
                    "claims": chunk.get("claims", []),
                })
            except json.JSONDecodeError:
                continue

    total = len(all_chunks)
    return {"chunks": all_chunks[offset: offset + limit], "total": total}


@router.get("/explore/chunks")
async def list_chunks(
    product: str = Query(default="", description="Filter by product slug"),
    facet: str = Query(default="", description="Filter by facet"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    chunks_dir = _data_dir() / "chunks"
    if not chunks_dir.exists():
        return {"chunks": [], "total": 0}

    all_chunks: list[dict] = []
    for f in sorted(chunks_dir.glob("*.jsonl")):
        if product and product not in f.stem:
            continue
        for line in f.read_text().splitlines():
            if not line.strip():
                continue
            try:
                chunk = json.loads(line)
                if facet and chunk.get("facet") != facet and chunk.get("metadata", {}).get("source_type") != facet:
                    continue
                all_chunks.append({
                    "chunk_id": chunk.get("chunk_id", ""),
                    "doc_id": chunk.get("doc_id", ""),
                    "text": chunk.get("text", "")[:500],
                    "section_title": chunk.get("section_title"),
                    "facet": chunk.get("facet", chunk.get("metadata", {}).get("source_type", "unknown")),
                    "stance": chunk.get("stance", "unknown"),
                    "evidence_score": chunk.get("evidence_score", 0),
                    "claims": chunk.get("claims", []),
                })
            except json.JSONDecodeError:
                continue

    total = len(all_chunks)
    return {"chunks": all_chunks[offset: offset + limit], "total": total}


@router.get("/explore/documents")
async def list_documents():
    md_dir = _data_dir() / "md"
    if not md_dir.exists():
        return {"documents": []}

    docs: list[dict] = []
    for f in sorted(md_dir.glob("*.md")):
        content = f.read_text()
        lines = content.split("\n")
        title = f.stem
        source_url = ""
        source_type = "unknown"
        for line in lines[:20]:
            if line.startswith("title:"):
                title = line.split(":", 1)[1].strip().strip('"')
            if line.startswith("source_url:"):
                source_url = line.split(":", 1)[1].strip().strip('"')
            if line.startswith("source_type:"):
                source_type = line.split(":", 1)[1].strip().strip('"')

        docs.append({
            "filename": f.name,
            "title": title,
            "source_url": source_url,
            "source_type": source_type,
            "size_bytes": f.stat().st_size,
            "preview": content[:300],
        })

    return {"documents": docs}


@router.get("/projects/{project_id}/graph")
async def get_project_graph(project_id: str):
    graph_dir = _data_dir() / "projects" / project_id / "graph"
    if not graph_dir.exists():
        return {"nodes": [], "edges": [], "communities": {}}

    graph_file = graph_dir / "graph.json"
    comm_file = graph_dir / "communities.json"

    nodes: list[dict] = []
    edges: list[dict] = []
    communities: dict = {}

    if graph_file.exists():
        try:
            data = json.loads(graph_file.read_text())
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
        except Exception as e:
            logger.warning("Failed to read graph.json: %s", e)

    if comm_file.exists():
        try:
            communities = json.loads(comm_file.read_text())
        except Exception as e:
            logger.warning("Failed to read communities: %s", e)

    return {"nodes": nodes, "edges": edges, "communities": communities}


@router.get("/explore/graph")
async def get_graph(product: str = Query(default="")):
    graph_dir = _data_dir() / "graph"
    if not graph_dir.exists():
        return {"nodes": [], "edges": [], "communities": {}}

    nodes: list[dict] = []
    edges: list[dict] = []
    communities: dict = {}

    entities_file = graph_dir / "entities.parquet"
    rels_file = graph_dir / "relationships.parquet"
    comm_file = graph_dir / "communities.json"

    if entities_file.exists():
        try:
            import pandas as pd
            df = pd.read_parquet(entities_file)
            for _, row in df.iterrows():
                nodes.append({
                    "id": row.get("id", ""),
                    "title": row.get("title", ""),
                    "type": row.get("type", "unknown"),
                    "description": row.get("description", ""),
                    "community_id": row.get("community_id", ""),
                    "chunk_count": len(row.get("text_unit_ids", [])),
                })
        except Exception as e:
            logger.warning("Failed to read entities parquet: %s", e)

    if rels_file.exists():
        try:
            import pandas as pd
            df = pd.read_parquet(rels_file)
            for _, row in df.iterrows():
                edges.append({
                    "source": row.get("source", ""),
                    "target": row.get("target", ""),
                    "type": row.get("type", ""),
                    "description": row.get("description", ""),
                    "weight": float(row.get("weight", 1.0)),
                })
        except Exception as e:
            logger.warning("Failed to read relationships parquet: %s", e)

    if comm_file.exists():
        try:
            communities = json.loads(comm_file.read_text())
        except Exception as e:
            logger.warning("Failed to read communities: %s", e)

    return {"nodes": nodes, "edges": edges, "communities": communities}


@router.get("/explore/persona/{persona_id}/evidence")
async def get_persona_evidence(persona_id: str):
    chunks_dir = _data_dir() / "chunks"
    if not chunks_dir.exists():
        return {"chunks": [], "entity_ids": []}

    all_chunks: dict[str, dict] = {}
    for f in chunks_dir.glob("*.jsonl"):
        for line in f.read_text().splitlines():
            if not line.strip():
                continue
            try:
                chunk = json.loads(line)
                all_chunks[chunk.get("chunk_id", "")] = chunk
            except json.JSONDecodeError:
                continue

    return {
        "chunks": list(all_chunks.values())[:100],
        "total_available": len(all_chunks),
    }
