"""ChromaDB vector store for chunk embeddings."""

import os
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings

from .embed import GeminiEmbedder


class VectorStore:
    """Persistent vector store using ChromaDB for chunk embeddings."""

    def __init__(self, embedder: GeminiEmbedder, persist_dir: str = "data/chroma", collection_name: str = "chunks"):
        """Initialize the vector store.

        Args:
            embedder: GeminiEmbedder instance for generating embeddings.
            persist_dir: Directory to persist the ChromaDB data.
            collection_name: Name of the collection.
        """
        self.embedder = embedder
        self.persist_dir = persist_dir
        self.collection_name = collection_name

        # Create persist directory if it doesn't exist
        os.makedirs(persist_dir, exist_ok=True)

        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> None:
        """Add chunks to the vector store.

        Args:
            chunks: List of chunk dictionaries. Each should have 'chunk_id' and 'text' keys.
        """
        if not chunks:
            return

        # Extract data for ChromaDB
        ids = [chunk['chunk_id'] for chunk in chunks]
        documents = [chunk['text'] for chunk in chunks]
        
        # Prepare metadata - flatten the chunk dict for ChromaDB compatibility
        metadatas = []
        for chunk in chunks:
            metadata = {}
            for key, value in chunk.items():
                if key == 'text':
                    continue  # text is stored separately
                if isinstance(value, dict):
                    # Flatten nested dict
                    for sub_key, sub_value in value.items():
                        metadata[f"{key}_{sub_key}"] = sub_value
                else:
                    metadata[key] = value
            metadatas.append(metadata)

        # Generate embeddings
        embeddings = self.embedder.embed_batch(documents)

        # Add to collection using upsert for idempotency
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def search(self, query_text: str, n_results: int = 5, where: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search the vector store for similar chunks.

        Args:
            query_text: The query string.
            n_results: Number of top results to return.
            where: Optional metadata filters.

        Returns:
            List of similar chunks with their metadata and distances.
        """
        # Embed the query
        query_embedding = self.embedder.embed_batch([query_text])[0]

        # Query the collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where
        )

        # Format results
        formatted_results = []
        for i in range(len(results['ids'][0])):
            result = {
                'chunk_id': results['ids'][0][i],
                'text': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i]
            }
            formatted_results.append(result)

        return formatted_results