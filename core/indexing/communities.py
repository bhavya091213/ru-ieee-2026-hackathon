# core/indexing/communities.py

import json
import logging
from pathlib import Path
from typing import Union, Dict, List, Any, Optional
import networkx as nx
import igraph as ig
import leidenalg as la
import pandas as pd
from google.genai import types
import google.genai as genai

logger = logging.getLogger(__name__)

COMMUNITY_SUMMARY_PROMPT = """
You are a research analyst summarizing a community of related entities and relationships from a knowledge graph about consumer products.

Given the following entities and relationships within a community:

Entities:
{entities_text}

Relationships:
{relationships_text}

Please provide a concise 2-3 sentence summary of the community's main theme. Focus on what product aspect, user concern, or market dynamic this community represents. Be specific and evidence-based.
"""

def _build_community_summary_prompt(entities: List[Dict], relationships: List[Dict]) -> str:
    """Build the prompt for community summarization."""
    entities_text = "\n".join([
        f"- {e['title']} ({e['type']}): {e['description']}"
        for e in entities
    ])
    
    relationships_text = "\n".join([
        f"- {r['source']} {r['type'].lower()} {r['target']}: {r['description']} (weight: {r['weight']})"
        for r in relationships
    ])
    
    return COMMUNITY_SUMMARY_PROMPT.format(
        entities_text=entities_text,
        relationships_text=relationships_text
    )

def detect_communities(
    graph: nx.Graph,
    output_dir: Union[str, Path],
    gemini_client: Optional[genai.Client] = None,
) -> Dict[str, Any]:
    """Run hierarchical Leiden clustering and generate community summaries.

    Args:
        graph: NetworkX graph with entity nodes and relationship edges.
        output_dir: Directory to write community JSON files (e.g., data/graph/).
        gemini_client: Optional Gemini client for generating community summaries.
            If None, summaries are skipped (useful for testing without API).

    Returns:
        Dict with keys:
        - "assignments": dict mapping resolution (str) to dict of community_id -> list of entity_ids
        - "summaries": dict mapping community_id (str) to summary text (resolution 1.0 only)
        - "num_communities": dict mapping resolution (str) to number of non-singleton communities
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Convert to igraph
    ig_graph = ig.Graph.from_networkx(graph)
    
    # Ensure weights are set
    if 'weight' not in ig_graph.es.attributes():
        ig_graph.es['weight'] = [graph.edges[e].get('weight', 1.0) for e in graph.edges()]

    resolutions = [0.1, 0.5, 1.0, 2.0, 5.0]
    assignments = {}
    num_communities = {}
    
    # Run Leiden at each resolution
    for resolution in resolutions:
        partition = la.find_partition(
            ig_graph,
            la.RBConfigurationVertexPartition,
            resolution_parameter=resolution,
            weights='weight',
            seed=42,
            n_iterations=-1,
        )
        
        # Map back to node names
        community_dict = {}
        for comm_id, members in enumerate(partition):
            if len(members) > 1:  # Filter singletons
                entity_ids = [ig_graph.vs[i]['_nx_name'] for i in members]
                community_dict[str(comm_id)] = entity_ids
        
        res_str = str(resolution)
        assignments[res_str] = community_dict
        num_communities[res_str] = len(community_dict)

    # Generate summaries for resolution 1.0
    summaries = {}
    primary_assignments = assignments['1.0']
    
    for comm_id, entity_ids in primary_assignments.items():
        if gemini_client is None:
            summaries[comm_id] = ""
            continue
            
        # Gather entities and relationships in community
        community_entities = []
        community_relationships = []
        
        for node_id in entity_ids:
            if node_id in graph.nodes:
                node_data = graph.nodes[node_id]
                community_entities.append({
                    'title': node_data.get('title', ''),
                    'type': node_data.get('type', ''),
                    'description': node_data.get('description', ''),
                })
        
        for source, target, edge_data in graph.edges(data=True):
            if source in entity_ids and target in entity_ids:
                community_relationships.append({
                    'source': source,
                    'target': target,
                    'type': edge_data.get('type', ''),
                    'description': edge_data.get('description', ''),
                    'weight': edge_data.get('weight', 1.0),
                })
        
        # Build prompt and call Gemini
        prompt = _build_community_summary_prompt(community_entities, community_relationships)
        
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="text/plain",
                ),
            )
            summary = response.text.strip() if response.text else ""
        except Exception as e:
            logger.warning(f"Failed to summarize community {comm_id}: {e}")
            summary = ""
        
        summaries[comm_id] = summary

    # Update graph nodes with community_id (primary resolution)
    for node_id in graph.nodes:
        graph.nodes[node_id]['community_id'] = None
    
    for comm_id, entity_ids in primary_assignments.items():
        for node_id in entity_ids:
            graph.nodes[node_id]['community_id'] = comm_id

    # Update entities.parquet with community_id
    entities_parquet = output_dir / 'entities.parquet'
    if entities_parquet.exists():
        entities_df = pd.read_parquet(entities_parquet)
        entities_df['community_id'] = entities_df['id'].map(
            lambda nid: graph.nodes.get(nid, {}).get('community_id')
        )
        entities_df.to_parquet(entities_parquet, index=False)

    # Write JSON files
    with open(output_dir / 'communities.json', 'w') as f:
        json.dump(summaries, f, indent=2)
    
    with open(output_dir / 'community_assignments.json', 'w') as f:
        json.dump(assignments, f, indent=2)

    return {
        'assignments': assignments,
        'summaries': summaries,
        'num_communities': num_communities,
    }