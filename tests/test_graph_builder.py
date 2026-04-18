import pytest
import networkx as nx
from unittest.mock import MagicMock, patch
from core.indexing.graph_builder import build_graph, extract_chunk, ChunkExtraction, ExtractedEntity, ExtractedRelationship

def test_build_graph_merges_entities():
    # Setup: Two chunks mentioning the same entity with different casing
    e1 = ExtractedEntity(id="iphone_18", title="iPhone 18", type="Product", description="New phone")
    e2 = ExtractedEntity(id="iphone", title="iphone 18", type="Product", description="The 2026 model")
    
    extraction_1 = ChunkExtraction(
        entities=[e1], relationships=[], claims=[], facet="other", stance="mixed",
        segment_hints=[], novelty_signals=[], evidence_score=0.8, rumor_confidence=0.1,
        direct_quote_candidates=[]
    )
    extraction_2 = ChunkExtraction(
        entities=[e2], relationships=[], claims=[], facet="other", stance="mixed",
        segment_hints=[], novelty_signals=[], evidence_score=0.9, rumor_confidence=0.1,
        direct_quote_candidates=[]
    )
    
    # Run: build the graph
    extractions = [("chunk_1", extraction_1), ("chunk_2", extraction_2)]
    graph = build_graph(extractions)
    
    # Assert: Should only have 1 node because (iphone 18, Product) matches (iPhone 18, Product)
    assert len(graph.nodes) == 1
    node = list(graph.nodes(data=True))[0][1]
    assert node['title'].lower() == "iphone 18"
    # Merged logic: should keep the longest description
    assert node['description'] == "The 2026 model"

def test_build_graph_sums_weights():
    # Setup: Use IDs that match what the slugifier will produce
    # If your code slugifies "iPhone 18" to "iphone_18", use that!
    source_id = "iphone"
    target_id = "battery"
    
    rel1 = ExtractedRelationship(source=source_id, target=target_id, type="SUPPORTS", description="Good", weight=0.5)
    rel2 = ExtractedRelationship(source=source_id, target=target_id, type="SUPPORTS", description="Great", weight=0.5)
    
    # We also need to ensure the entities actually exist in the graph
    e1 = ExtractedEntity(id=source_id, title="iphone", type="Product", description="phone")
    e2 = ExtractedEntity(id=target_id, title="battery", type="Feature", description="power")

    extraction = ChunkExtraction(
        entities=[e1, e2], # ADDED: The graph needs the nodes to build the edge!
        relationships=[rel1, rel2],
        claims=[], facet="other", stance="mixed",
        segment_hints=[], novelty_signals=[], evidence_score=0.8, rumor_confidence=0.1,
        direct_quote_candidates=[]
    )
    
    graph = build_graph([("chunk_1", extraction)])
    
    # Assert: Now the nodes "iphone" and "battery" exist, so the edge should too
    edge_data = graph.get_edge_data(source_id, target_id)
    
    assert edge_data is not None, "Edge was not created!"
    assert edge_data['weight'] == 1.0