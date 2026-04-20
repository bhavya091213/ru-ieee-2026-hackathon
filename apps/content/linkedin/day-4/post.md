# Day 4 - Data Pipeline & Vector Database Engineering

**Platform:** LinkedIn
**Format:** Text + GitHub link
**Engagement Goal:** Target data engineers, ML engineers, scientists — show applied data engineering skills

---

## Post Copy

The hardest part of building PanelForge wasn't the AI. It was the data.

Here's the data engineering problem we solved in 24 hours:

**The challenge:** Turn messy, unstructured internet opinions (Reddit threads, YouTube transcripts, product reviews) into structured, queryable evidence that AI personas can cite.

**The pipeline we built:**

1. **Multi-source ingestion**
   - Reddit (PRAW API + public JSON fallback)
   - YouTube (transcript extraction)
   - Web articles (Trafilatura for clean text extraction)
   - Each source normalized to Markdown with YAML frontmatter

2. **Intelligent chunking**
   - Section-aware splitting (respects markdown headers)
   - 500-token sliding window with 50-token overlap
   - Metadata preserved: source_url, author, date, doc_id

3. **Semantic enrichment (no LLM overhead)**
   - Keyword-based facet classification (camera, battery, price, design, etc.)
   - Sentiment stance detection (positive/negative/mixed/review)
   - Co-occurrence graph generation from keyword patterns

4. **Vector indexing**
   - ChromaDB with HNSW index (cosine similarity)
   - Gemini embeddings (384-dim vectors)
   - Batch processing (20 texts per API call)
   - Metadata filtering: query by facet, stance, source_type

5. **Graph memory**
   - Entity-relationship extraction from chunks
   - Leiden community detection for topic clustering
   - Parquet export (GraphRAG-compatible format)

**Problems we hit:**
- Reddit rate limiting at 3 AM (switched to public JSON fallback)
- Embedding batch size tuning (started at 100, settled on 20 for reliability)
- Chunk overlap sweet spot (too much = redundancy, too little = lost context)

**The result:** Every insight in our dashboard traces back to a real source. Every persona belief cites specific evidence chunks. No hallucination by design.

**Data visualization dashboard:**
We also built a data exploration interface where you can browse documents, filter chunks by facet/stance, and visualize the entity graph interactively. This wasn't just for judges — it's how we debugged the pipeline.

The best AI products aren't built on prompts. They're built on data infrastructure.

[GitHub link]

#DataEngineering #VectorDatabase #ChromaDB #RAG #MachineLearning #NLP #BuildInPublic #DataPipeline

---

## Notes

- This post targets a technical audience — use precise terminology
- The "problems we hit" section humanizes the post and shows real engineering
- End with a philosophical point about data > prompts (controversial enough to generate discussion)
- Link to specific files/directories in the repo if possible
