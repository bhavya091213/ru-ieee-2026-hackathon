"""Shared test fixtures for PanelForge Workstream 1."""

import pytest
from pathlib import Path
from unittest.mock import MagicMock
import networkx as nx
import chromadb


@pytest.fixture
def tmp_data_dir(tmp_path: Path) -> Path:
    """A temporary directory mimicking the data/ structure."""
    # Create all required subdirectories
    (tmp_path / "raw").mkdir()
    (tmp_path / "md").mkdir()
    (tmp_path / "chunks").mkdir()
    (tmp_path / "graph").mkdir()
    (tmp_path / "vectors").mkdir()
    (tmp_path / "vectors" / "chroma").mkdir()
    (tmp_path / "cache").mkdir()

    return tmp_path


@pytest.fixture
def sample_chunks():
    """Returns a list of pre-built chunk dictionaries."""
    return [
        {
            "chunk_id": "chunk_001",
            "doc_id": "doc_001",
            "text": "The new EcoDrive sedan offers exceptional fuel efficiency with up to 45 MPG on the highway. Customers love the quiet cabin and smooth ride, though some complain about the limited cargo space.",
            "section_title": "Product Reviews",
            "char_start": 0,
            "char_end": 150,
            "metadata": {
                "canonical_product": "EcoDrive Sedan",
                "source_type": "web",
                "published_at": "2024-01-15T10:30:00Z"
            }
        },
        {
            "chunk_id": "chunk_002",
            "doc_id": "doc_002",
            "text": "Safety features include automatic emergency braking, lane-keeping assist, and adaptive cruise control. The infotainment system is intuitive but lacks Apple CarPlay compatibility.",
            "section_title": "Technical Specifications",
            "char_start": 151,
            "char_end": 280,
            "metadata": {
                "canonical_product": "EcoDrive Sedan",
                "source_type": "reddit",
                "published_at": "2024-01-16T14:20:00Z"
            }
        },
        {
            "chunk_id": "chunk_003",
            "doc_id": "doc_003",
            "text": "At $28,500 MSRP, the EcoDrive competes directly with the Toyota Camry and Honda Accord. Early buyers report high satisfaction but note that dealer markup can add $2,000-3,000 to the price.",
            "section_title": "Pricing Analysis",
            "char_start": 281,
            "char_end": 400,
            "metadata": {
                "canonical_product": "EcoDrive Sedan",
                "source_type": "youtube",
                "published_at": "2024-01-17T09:45:00Z"
            }
        }
    ]


@pytest.fixture
def mock_gemini():
    """A mock Gemini API client that returns canned extraction responses."""
    mock_client = MagicMock()

    # Canned response matching ChunkExtraction schema shape
    mock_response = {
        "entities": [
            {"name": "EcoDrive Sedan", "type": "PRODUCT", "description": "A fuel-efficient sedan model"},
            {"name": "Toyota Camry", "type": "PRODUCT", "description": "Competitor sedan model"}
        ],
        "relationships": [
            {"source": "EcoDrive Sedan", "target": "Toyota Camry", "type": "COMPETES_WITH", "description": "Direct market competition"}
        ],
        "claims": [
            {"text": "offers exceptional fuel efficiency", "confidence": 0.9, "supports": ["fuel efficiency claim"]},
            {"text": "lacks Apple CarPlay compatibility", "confidence": 0.8, "supports": ["infotainment limitation"]}
        ],
        "facet": "PRODUCT_FEATURES",
        "stance": "MIXED",
        "segment_hints": ["review", "technical", "pricing"],
        "novelty_signals": ["new_product_launch", "competitor_comparison"],
        "evidence_score": 0.85,
        "rumor_confidence": 0.1,
        "direct_quote_candidates": [
            "Customers love the quiet cabin and smooth ride",
            "dealer markup can add $2,000-3,000 to the price"
        ]
    }

    mock_client.return_value = mock_response
    return mock_client


@pytest.fixture
def chroma_collection():
    """An ephemeral ChromaDB collection for tests."""
    client = chromadb.EphemeralClient()
    collection = client.create_collection(
        name="test_chunks",
        metadata={"hnsw:space": "cosine"}
    )
    return collection


@pytest.fixture
def sample_graph():
    """A pre-built NetworkX graph with nodes and edges."""
    G = nx.Graph()

    # Add nodes (entities)
    G.add_node("EcoDrive Sedan", title="EcoDrive Sedan", type="PRODUCT",
               description="Fuel-efficient sedan", text_unit_ids=["chunk_001", "chunk_002"],
               community_id=0)
    G.add_node("Toyota Camry", title="Toyota Camry", type="PRODUCT",
               description="Competitor sedan", text_unit_ids=["chunk_003"],
               community_id=0)
    G.add_node("Fuel Efficiency", title="Fuel Efficiency", type="FEATURE",
               description="Gas mileage performance", text_unit_ids=["chunk_001"],
               community_id=1)
    G.add_node("Infotainment", title="Infotainment", type="FEATURE",
               description="Car entertainment system", text_unit_ids=["chunk_002"],
               community_id=1)
    G.add_node("Pricing", title="Pricing", type="ASPECT",
               description="Cost and value analysis", text_unit_ids=["chunk_003"],
               community_id=2)

    # Add edges (relationships)
    G.add_edge("EcoDrive Sedan", "Toyota Camry", type="COMPETES_WITH",
               description="Market competition", weight=0.8,
               text_unit_ids=["chunk_003"])
    G.add_edge("EcoDrive Sedan", "Fuel Efficiency", type="HAS_FEATURE",
               description="Product feature", weight=0.9,
               text_unit_ids=["chunk_001"])
    G.add_edge("EcoDrive Sedan", "Infotainment", type="HAS_FEATURE",
               description="Product feature", weight=0.7,
               text_unit_ids=["chunk_002"])
    G.add_edge("EcoDrive Sedan", "Pricing", type="HAS_ASPECT",
               description="Pricing consideration", weight=0.6,
               text_unit_ids=["chunk_003"])
    G.add_edge("Fuel Efficiency", "Infotainment", type="RELATED_TO",
               description="Feature correlation", weight=0.5,
               text_unit_ids=["chunk_001", "chunk_002"])

    return G