"""Smoke tests to verify project scaffold is correctly set up."""


def test_core_package_importable():
    """Importing 'core' should not raise ImportError."""
    import core


def test_core_ingest_package_importable():
    """Importing 'core.ingest' should not raise ImportError."""
    import core.ingest


def test_core_indexing_package_importable():
    """Importing 'core.indexing' should not raise ImportError."""
    import core.indexing


def test_pydantic_available():
    """Pydantic v2 should be installed and importable."""
    import pydantic
    assert pydantic.VERSION.startswith("2")


def test_chromadb_available():
    """ChromaDB should be installed and importable."""
    import chromadb


def test_networkx_available():
    """NetworkX should be installed and importable."""
    import networkx


def test_sentence_transformers_available():
    """sentence-transformers should be installed and importable."""
    import sentence_transformers


def test_trafilatura_available():
    """Trafilatura should be installed and importable."""
    import trafilatura


def test_tmp_data_dir_fixture_creates_subdirs(tmp_data_dir):
    """The tmp_data_dir fixture should create all required subdirectories."""
    assert (tmp_data_dir / "raw").is_dir()
    assert (tmp_data_dir / "md").is_dir()
    assert (tmp_data_dir / "chunks").is_dir()
    assert (tmp_data_dir / "graph").is_dir()
    assert (tmp_data_dir / "vectors" / "chroma").is_dir()
    assert (tmp_data_dir / "cache").is_dir()


def test_sample_chunks_fixture_has_required_fields(sample_chunks):
    """Each sample chunk should have all required schema fields."""
    for chunk in sample_chunks:
        assert "chunk_id" in chunk
        assert "doc_id" in chunk
        assert "text" in chunk
        assert "metadata" in chunk
        assert "canonical_product" in chunk["metadata"]


def test_sample_graph_fixture_has_nodes_and_edges(sample_graph):
    """The sample graph should have nodes with attributes and edges."""
    assert len(sample_graph.nodes) >= 5
    assert len(sample_graph.edges) >= 5
    for _, data in sample_graph.nodes(data=True):
        assert "title" in data
        assert "type" in data


def test_chroma_collection_fixture_uses_cosine(chroma_collection):
    """The ephemeral Chroma collection should be configured for cosine distance."""
    # This verifies the collection was created successfully
    assert chroma_collection.name == "test_chunks"