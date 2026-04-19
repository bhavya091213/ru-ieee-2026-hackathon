# core/indexing/graph_parquet.py

import uuid
import json
from pathlib import Path
from typing import Union, List, Dict, Any
import pandas as pd
import networkx as nx

def export_parquet(
    graph: Union[nx.Graph, str, Path],
    chunks: List[Dict[str, Any]],
    output_dir: Union[str, Path],
) -> Dict[str, Path]:
    """Export NetworkX graph to three GraphRAG-compatible parquet files.

    Args:
        graph: NetworkX graph with entity nodes and relationship edges.
            If str/Path, load from JSON via node_link_graph.
            Nodes have attributes: title, type, description, text_unit_ids.
            Edges have attributes: type, description, weight, text_unit_ids.
        chunks: List of chunk dicts with keys: chunk_id, text, entity_ids.
        output_dir: Directory to write parquet files into (e.g., data/graph/).

    Returns:
        Dict mapping table name to file path:
        {"entities": Path, "relationships": Path, "text_units": Path}
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load graph if path
    if isinstance(graph, (str, Path)):
        with open(graph, 'r') as f:
            graph_data = json.load(f)
        graph = nx.node_link_graph(graph_data)
    elif not isinstance(graph, nx.Graph):
        raise ValueError("graph must be NetworkX Graph or path to JSON")

    # Entities DataFrame
    entities_records = []
    for node_id, node_data in graph.nodes(data=True):
        entities_records.append({
            'id': node_id,
            'title': node_data.get('title', ''),
            'type': node_data.get('type', ''),
            'description': node_data.get('description', ''),
            'text_unit_ids': node_data.get('text_unit_ids', []),
        })
    entities_df = pd.DataFrame(entities_records)
    entities_path = output_dir / 'entities.parquet'
    entities_df.to_parquet(entities_path, index=False)

    # Relationships DataFrame
    relationships_records = []
    for source, target, edge_data in graph.edges(data=True):
        rel_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"{source}:{target}:{edge_data.get('type', '')}")
        relationships_records.append({
            'id': str(rel_id),
            'source': source,
            'target': target,
            'type': edge_data.get('type', ''),
            'description': edge_data.get('description', ''),
            'weight': edge_data.get('weight', 1.0),
            'text_unit_ids': edge_data.get('text_unit_ids', []),
        })
    relationships_df = pd.DataFrame(relationships_records)
    relationships_path = output_dir / 'relationships.parquet'
    relationships_df.to_parquet(relationships_path, index=False)

    # Text units DataFrame
    text_units_records = []
    for chunk in chunks:
        text_units_records.append({
            'id': chunk.get('chunk_id', ''),
            'text': chunk.get('text', ''),
            'entity_ids': chunk.get('entity_ids', []),
        })
    text_units_df = pd.DataFrame(text_units_records)
    text_units_path = output_dir / 'text_units.parquet'
    text_units_df.to_parquet(text_units_path, index=False)

    return {
        'entities': entities_path,
        'relationships': relationships_path,
        'text_units': text_units_path,
    }