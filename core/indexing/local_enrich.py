"""Fast local chunk enrichment — no LLM calls.

Classifies facet and stance using keyword signals, then builds a
lightweight pseudo-graph from co-occurrence so downstream code that
expects entity_ids / community_id still works.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

FACET_KEYWORDS: dict[str, list[str]] = {
    "camera": ["camera", "photo", "lens", "zoom", "portrait", "selfie", "video recording", "megapixel", "sensor", "hdr", "night mode", "macro"],
    "battery": ["battery", "charging", "mah", "charge", "power bank", "wireless charging", "fast charge", "battery life", "drain"],
    "price": ["price", "cost", "expensive", "cheap", "afford", "value", "dollar", "budget", "trade-in", "deal", "sale"],
    "design": ["design", "build", "weight", "thin", "color", "titanium", "glass", "bezel", "screen", "display", "size", "ergonomic"],
    "performance": ["performance", "speed", "fast", "lag", "processor", "chip", "ram", "benchmark", "gaming", "thermal", "heat"],
    "software": ["software", "update", "os", "app", "bug", "feature", "ui", "interface", "ai", "siri", "assistant"],
    "privacy": ["privacy", "security", "encrypt", "tracking", "data", "permission", "telemetry"],
    "ecosystem": ["ecosystem", "airdrop", "handoff", "continuity", "sync", "cross-device", "integration", "lock-in"],
}

_POSITIVE = {"love", "great", "amazing", "excellent", "fantastic", "best", "incredible", "impressive", "solid", "perfect", "beautiful", "smooth", "worth", "recommend", "enjoy", "happy", "pleased", "stunning"}
_NEGATIVE = {"bad", "terrible", "awful", "worst", "hate", "disappointing", "poor", "ugly", "slow", "broken", "useless", "garbage", "horrible", "annoying", "overpriced", "expensive", "mediocre", "frustrating", "painful"}
_MIXED = {"okay", "decent", "fine", "average", "mixed", "trade-off", "compromise", "but", "however", "although", "depends"}


def classify_facet(text: str) -> str:
    lower = text.lower()
    scores: dict[str, int] = {}
    for facet, keywords in FACET_KEYWORDS.items():
        scores[facet] = sum(1 for kw in keywords if kw in lower)
    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    return best if scores[best] > 0 else "other"


def classify_stance(text: str) -> str:
    words = set(re.findall(r"[a-z']+", text.lower()))
    pos = len(words & _POSITIVE)
    neg = len(words & _NEGATIVE)
    mix = len(words & _MIXED)
    if pos > neg and pos > mix:
        return "positive"
    if neg > pos and neg > mix:
        return "negative"
    if mix > 0 or (pos > 0 and neg > 0):
        return "mixed"
    return "review"


def enrich_chunks(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Add facet, stance, and a pseudo community_id to each chunk."""
    enriched = []
    for chunk in chunks:
        text = chunk.get("text", "")
        facet = chunk.get("facet") or classify_facet(text)
        stance = chunk.get("stance") or classify_stance(text)
        community_id = f"community-{facet}-{stance}"

        updated = {**chunk, "facet": facet, "stance": stance, "community_id": community_id}
        meta = updated.get("metadata", {})
        meta["facet"] = facet
        meta["stance"] = stance
        meta["community_id"] = community_id
        updated["metadata"] = meta
        enriched.append(updated)
    return enriched


def build_pseudo_graph(
    chunks: list[dict[str, Any]],
    output_dir: str,
) -> dict[str, Any]:
    """Build a co-occurrence pseudo-graph from enriched chunks.

    Entities = top keywords per facet. Edges = co-occurrence in same chunk.
    Writes graph.json, entities.parquet-equivalent, and communities.json
    so downstream explore endpoints still work.
    """
    graph_dir = Path(output_dir) / "graph"
    graph_dir.mkdir(parents=True, exist_ok=True)

    facet_texts: dict[str, list[str]] = defaultdict(list)
    for chunk in chunks:
        facet_texts[chunk.get("facet", "other")].append(chunk.get("text", ""))

    nodes: list[dict] = []
    node_ids: set[str] = set()
    edges: list[dict] = []

    for facet, texts in facet_texts.items():
        words = re.findall(r"[a-z]{4,}", " ".join(texts).lower())
        top_words = [w for w, _ in Counter(words).most_common(8) if w not in {"this", "that", "with", "from", "they", "have", "been", "were", "what", "your", "about", "just", "like", "really", "very", "much"}]

        for word in top_words[:5]:
            nid = f"{facet}_{word}"
            if nid not in node_ids:
                node_ids.add(nid)
                nodes.append({
                    "id": nid,
                    "title": word,
                    "type": "Feature" if facet != "other" else "Claim",
                    "description": f"Keyword '{word}' from {facet} discussions",
                    "community": f"community-{facet}",
                })

        for i, w1 in enumerate(top_words[:5]):
            for w2 in top_words[i + 1:5]:
                edges.append({
                    "source": f"{facet}_{w1}",
                    "target": f"{facet}_{w2}",
                    "type": "CO_OCCURS_WITH",
                    "weight": 1.0,
                })

    communities: dict[str, Any] = {}
    for facet in facet_texts:
        comm_id = f"community-{facet}"
        member_ids = [n["id"] for n in nodes if n.get("community") == comm_id]
        if member_ids:
            communities[comm_id] = {
                "id": comm_id,
                "title": facet.replace("_", " ").title(),
                "summary": f"Discussion cluster around {facet}",
                "entity_ids": member_ids,
            }

    graph_data = {"nodes": nodes, "edges": edges}
    with open(graph_dir / "graph.json", "w") as f:
        json.dump(graph_data, f, indent=2)

    with open(graph_dir / "communities.json", "w") as f:
        json.dump(communities, f, indent=2)

    logger.info(
        "Pseudo-graph: %d nodes, %d edges, %d communities",
        len(nodes), len(edges), len(communities),
    )
    return {"entity_count": len(nodes), "community_count": len(communities)}
