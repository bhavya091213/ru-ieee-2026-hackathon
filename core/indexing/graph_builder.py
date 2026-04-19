# core/indexing/graph_builder.py

import json
import logging
import time
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any
import networkx as nx
from pydantic import BaseModel, ValidationError
from google.genai import types
import google.genai as genai

from .prompts import GRAPH_EXTRACTION_PROMPT

logger = logging.getLogger(__name__)

class ExtractedEntity(BaseModel):
    id: str
    title: str
    type: str  # Literal["Product", "Feature", "Concern", "Competitor", "Segment", "Claim"]
    description: str

class ExtractedRelationship(BaseModel):
    source: str
    target: str
    type: str  # Literal["MENTIONS", "SUPPORTS", "CONTRADICTS", "COMPARES_TO", "CO_OCCURS_WITH"]
    description: str
    weight: float

class ChunkExtraction(BaseModel):
    entities: List[ExtractedEntity]
    relationships: List[ExtractedRelationship]
    claims: List[str]
    facet: str  # Literal["camera", "battery", "price", "design", "privacy", "ecosystem", "other"]
    stance: str  # Literal["positive", "negative", "mixed", "rumor", "review"]
    segment_hints: List[str]
    novelty_signals: List[str]
    evidence_score: float  # 0-1
    rumor_confidence: float  # 0-1
    direct_quote_candidates: List[str]

def _strip_additional_properties(schema):
    if isinstance(schema, dict):
        return {k: _strip_additional_properties(v) for k, v in schema.items() if k != "additionalProperties"}
    if isinstance(schema, list):
        return [_strip_additional_properties(item) for item in schema]
    return schema

def _slugify(text: str) -> str:
    """Simple slugify function to create URL-safe IDs."""
    import re
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    text = text.strip('_')
    return text

def extract_chunk(
    chunk_id: str,
    chunk_text: str,
    gemini_client: genai.Client,
    cache_dir: Path,
    canonical_product: str = "",
    max_retries: int = 5,
) -> Optional[ChunkExtraction]:
    """Extract entities and relationships from a single chunk using Gemini.

    Checks cache first. On cache hit, returns deserialized result.
    On cache miss, calls Gemini with temperature=0.0 and ChunkExtraction
    as the response_schema. Caches successful results. Returns None if
    extraction fails (invalid response, etc.).
    """
    cache_file = cache_dir / f"{chunk_id}.json"

    # Check cache
    if cache_file.exists():
        try:
            with open(cache_file, 'r') as f:
                data = json.load(f)
            extraction = ChunkExtraction(**data)
            logger.info(f"Cache hit for chunk {chunk_id}")
            return extraction
        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Corrupt cache for chunk {chunk_id}: {e}")

    # Prepare prompt
    prompt = GRAPH_EXTRACTION_PROMPT.format(
        canonical_product=canonical_product,
        text=chunk_text
    )

    # Call Gemini with retries
    for attempt in range(max_retries):
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",  # Use stable Flash model
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_schema=_strip_additional_properties(ChunkExtraction.model_json_schema()),
                    response_mime_type="application/json",
                ),
            )

            # Parse response
            if response.text:
                try:
                    data = json.loads(response.text)
                    extraction = ChunkExtraction(**data)
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.warning(f"Invalid response for chunk {chunk_id}: {e}")
                    return None
            else:
                logger.warning(f"Empty response for chunk {chunk_id}")
                return None

            # Cache successful result
            cache_dir.mkdir(parents=True, exist_ok=True)
            with open(cache_file, 'w') as f:
                json.dump(extraction.model_dump(), f, indent=2)

            logger.info(f"Extracted and cached chunk {chunk_id}")
            return extraction

        except Exception as e:
            if "rate limit" in str(e).lower() or "429" in str(e):
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"Rate limit for chunk {chunk_id}, retrying in {wait_time}s")
                time.sleep(wait_time)
            else:
                logger.error(f"Error extracting chunk {chunk_id}: {e}")
                return None

    logger.error(f"Failed to extract chunk {chunk_id} after {max_retries} retries")
    return None

def build_graph(
    extractions: List[Tuple[str, ChunkExtraction]],
) -> nx.Graph:
    """Build a NetworkX graph from a list of (chunk_id, extraction) pairs.

    Merges entities by (title.lower(), type). Deduplicates edges by
    (source, target, type) with weight summation. Assigns slugified
    entity IDs.
    """
    graph = nx.Graph()

    # Entity merging: key is (title.lower(), type)
    entity_map: Dict[Tuple[str, str], Dict[str, Any]] = {}

    # Edge merging: key is (source_id, target_id, type)
    edge_map: Dict[Tuple[str, str, str], Dict[str, Any]] = {}

    for chunk_id, extraction in extractions:
        for entity in extraction.entities:
            key = (entity.title.lower(), entity.type)
            if key not in entity_map:
                entity_map[key] = {
                    'id': _slugify(entity.title),
                    'title': entity.title,
                    'type': entity.type,
                    'description': entity.description,
                    'text_unit_ids': [chunk_id]
                }
            else:
                # Merge: keep longest description, union text_unit_ids
                existing = entity_map[key]
                if len(entity.description) > len(existing['description']):
                    existing['description'] = entity.description
                if chunk_id not in existing['text_unit_ids']:
                    existing['text_unit_ids'].append(chunk_id)

        for relationship in extraction.relationships:
            source_key = (relationship.source.lower(), "Entity")  # Assuming source is entity title
            target_key = (relationship.target.lower(), "Entity")
            # Actually, need to map to entity IDs
            # For simplicity, assume source/target are entity titles, find matching entity
            source_id = None
            target_id = None
            for key, ent in entity_map.items():
                if key[0] == relationship.source.lower():
                    source_id = ent['id']
                if key[0] == relationship.target.lower():
                    target_id = ent['id']

            if source_id and target_id:
                edge_key = (source_id, target_id, relationship.type)
                if edge_key not in edge_map:
                    edge_map[edge_key] = {
                        'type': relationship.type,
                        'description': relationship.description,
                        'weight': relationship.weight,
                        'text_unit_ids': [chunk_id]
                    }
                else:
                    # Sum weights, union text_unit_ids, keep longest description
                    existing = edge_map[edge_key]
                    existing['weight'] += relationship.weight
                    if len(relationship.description) > len(existing['description']):
                        existing['description'] = relationship.description
                    if chunk_id not in existing['text_unit_ids']:
                        existing['text_unit_ids'].append(chunk_id)

    # Add nodes
    for entity in entity_map.values():
        graph.add_node(entity['id'], **entity)

    # Add edges
    for (source, target, _), edge_data in edge_map.items():
        graph.add_edge(source, target, **edge_data)

    return graph

def run_extraction_pipeline(
    chunks_jsonl_path: Path,
    output_dir: Path,
    gemini_client: genai.Client,
    chroma_store=None,
    canonical_product: str = "",
) -> nx.Graph:
    """Orchestrate the full extraction and graph building pipeline.

    1. Read chunks from JSONL
    2. Extract each chunk (with caching and rate limiting)
    3. Build the merged graph
    4. Write enriched JSONL to {product}_enriched.jsonl
    5. Update ChromaDB metadata with facet/stance
    6. Serialize graph to data/graph/graph.json
    7. Return the NetworkX graph
    """
    cache_dir = output_dir / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Read chunks
    chunks = []
    with open(chunks_jsonl_path, 'r') as f:
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))

    # Extract each chunk
    extractions = []
    metadata_updates = {}
    enriched_chunks = []

    for chunk in chunks:
        chunk_id = chunk['chunk_id']
        extraction = extract_chunk(
            chunk_id=chunk_id,
            chunk_text=chunk['text'],
            gemini_client=gemini_client,
            cache_dir=cache_dir,
            canonical_product=canonical_product,
        )
        if extraction:
            extractions.append((chunk_id, extraction))
            metadata_updates[chunk_id] = {
                'facet': extraction.facet,
                'stance': extraction.stance
            }
            # Enrich chunk
            enriched_chunk = chunk.copy()
            enriched_chunk.update({
                'facet': extraction.facet,
                'stance': extraction.stance,
                'claims': extraction.claims,
                'novelty_signals': extraction.novelty_signals,
                'rumor_confidence': extraction.rumor_confidence,
                'direct_quote_candidates': extraction.direct_quote_candidates,
                'evidence_score': extraction.evidence_score,
            })
            enriched_chunks.append(enriched_chunk)
        else:
            # Keep original chunk if extraction failed
            enriched_chunks.append(chunk)

    # Build graph
    graph = build_graph(extractions)

    # Write enriched JSONL
    product_name = chunks_jsonl_path.stem  # e.g., "iphone_18"
    enriched_path = output_dir / "chunks" / f"{product_name}_enriched.jsonl"
    enriched_path.parent.mkdir(parents=True, exist_ok=True)
    with open(enriched_path, 'w') as f:
        for chunk in enriched_chunks:
            f.write(json.dumps(chunk) + '\n')

    # Update ChromaDB metadata
    if chroma_store and metadata_updates:
        chroma_store.update_metadata(list(metadata_updates.keys()), metadata_updates)

    # Serialize graph
    graph_path = output_dir / "graph" / "graph.json"
    graph_path.parent.mkdir(parents=True, exist_ok=True)
    graph_data = nx.node_link_data(graph)
    with open(graph_path, 'w') as f:
        json.dump(graph_data, f, indent=2)

    return graph