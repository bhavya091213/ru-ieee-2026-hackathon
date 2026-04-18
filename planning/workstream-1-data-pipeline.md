# Workstream 1: Data Pipeline & Graph Memory

**Owner:** Friend A
**Hours:** 0-17 (active), 20-21 (integration)

## Mission

Build everything from raw URLs to queryable memory. By hour 10, the other two workstreams should be able to call a retrieval function and get back ranked, metadata-filtered chunks plus graph neighbors.

## Deliverables

| # | Deliverable | Target Hour | Depends On |
|---|-------------|-------------|------------|
| 1 | Markdown ingestion pipeline (seed URLs + PRAW + YouTube captions) | 2-3 | Schemas from WS2 |
| 2 | Chunker + JSONL manifest | 4-5 | (1) |
| 3 | Local embedding pipeline (MiniLM) + Chroma collection populated | 6 | (2) |
| 4 | Graph builder: extract entities/relationships from chunks | 7 | (2), extraction schemas from WS2 |
| 5 | Parquet export (entities.parquet, relationships.parquet, text_units.parquet) | 8 | (4) |
| 6 | Community detection (Leiden) + community summaries | 9 | (5) |
| 7 | Retrieval layer: `retrieve(query, filters, top_k) -> chunks + graph_neighbors` | 10 | (3), (4) |
| 8 | Historical demo corpus (pre-ingested product for demo) | 17 | (1)-(7) |

## Files You Own

```
core/
  ingest/
    fetch.py           # Trafilatura + Markdownify URL fetcher
    reddit.py          # PRAW wrapper
    youtube.py         # YouTube Data API + caption download
    md_writer.py       # Canonical .md file writer with YAML frontmatter
  indexing/
    chunk.py           # Markdown -> evidence units
    embed.py           # sentence-transformers/all-MiniLM-L6-v2 wrapper
    chroma_store.py    # Chroma collection create/populate/query
    graph_builder.py   # NetworkX/igraph graph from extracted entities
    graph_parquet.py   # Export to GraphRAG-compatible parquet tables
    communities.py     # Leiden clustering + community labels
    retrieve.py        # Unified retrieval: semantic + metadata + graph ego-net
data/
  raw/                 # Downloaded HTML/JSON
  md/                  # Canonical Markdown files
  chunks/              # chunk JSONL
  graph/               # parquet + networkx pickle
  vectors/chroma/      # Chroma persistent store
scripts/
  run_ingest.py        # CLI: product name + seed URLs -> full pipeline
  bootstrap_demo_project.py  # Pre-baked demo data
```

## Interface Contracts

### What you produce (consumed by WS2 and WS3)

**1. Canonical Markdown file format**
```yaml
---
doc_id: str
canonical_product: str
source_type: web_article | reddit_post | reddit_comment | youtube
source_url: str
title: str
published_at: str  # ISO date
author: str
language: str
retrieved_at: str  # ISO datetime
---
# Content here
```

**2. Chunk JSONL record**
```json
{
  "chunk_id": "chunk_014",
  "doc_id": "doc_appleinsider_001",
  "text": "...",
  "section_title": "Camera improvements",
  "char_start": 1200,
  "char_end": 1850,
  "metadata": {
    "canonical_product": "iphone_18",
    "source_type": "web_article",
    "published_at": "2026-04-17",
    "facet": "camera",
    "stance": "positive"
  }
}
```

**3. Retrieval function signature**
```python
async def retrieve(
    query: str,
    canonical_product: str,
    facets: list[str] | None = None,
    stances: list[str] | None = None,
    scenario_tags: list[str] | None = None,
    top_k: int = 12,
) -> RetrievalResult:
    """Returns ranked chunks + graph ego-network for relevant entities."""

@dataclass(frozen=True)
class RetrievalResult:
    chunks: list[ScoredChunk]       # text + metadata + similarity score
    graph_neighbors: list[GraphNode] # 1-hop neighbors of matched entities
    entity_ids: list[str]            # entity IDs touched
```

**4. Graph parquet schema**

`entities.parquet`:
| Column | Type |
|--------|------|
| id | str |
| title | str |
| type | str (Product, Feature, Concern, Competitor, Segment, Claim) |
| description | str |
| text_unit_ids | list[str] |

`relationships.parquet`:
| Column | Type |
|--------|------|
| id | str |
| source | str |
| target | str |
| type | str (MENTIONS, SUPPORTS, CONTRADICTS, COMPARES_TO, CO_OCCURS_WITH) |
| description | str |
| weight | float |
| text_unit_ids | list[str] |

### What you consume (from WS2)

- **Extraction schemas** (Pydantic models for chunk structured extraction output) - needed by hour 4 so you can populate graph fields
- **Facet/stance enums** - the controlled vocabulary for metadata fields

## Key Technical Decisions

- **Chroma** for vector store (persistent mode, `./data/vectors/chroma`)
- **sentence-transformers/all-MiniLM-L6-v2** for embeddings (384-dim)
- **NetworkX** for in-process graph (igraph if Leiden performance matters)
- **leidenalg** for community detection
- **Trafilatura** for web content extraction
- **PRAW** for Reddit (needs Reddit API credentials in .env)
- Chunk size target: ~500 tokens with 50-token overlap
- Chroma metadata filters: `canonical_product`, `facet`, `stance`, `source_type`

## Hour-by-Hour

| Hour | Task | Output |
|------|------|--------|
| 0 | Env setup, pip install, verify Chroma + MiniLM load | Working .venv |
| 1 | Wait for schemas from WS2; start `fetch.py` scaffold | - |
| 2 | `fetch.py` + `md_writer.py`: URL -> Markdown | Can ingest a URL to .md |
| 3 | `reddit.py`: PRAW fetch + Markdown output | Reddit posts as .md |
| 4 | `chunk.py`: Markdown -> chunk JSONL | Chunks on disk |
| 5 | `youtube.py`: caption discovery + download | YouTube sources working |
| 6 | `embed.py` + `chroma_store.py`: embed chunks, populate Chroma | Queryable vector DB |
| 7 | `graph_builder.py`: consume WS2's structured extraction output, build graph | NetworkX graph in memory |
| 8 | `graph_parquet.py`: export to parquet tables | GraphRAG-compatible files |
| 9 | `communities.py`: Leiden clustering on graph | Community labels |
| 10 | `retrieve.py`: unified retrieval (semantic + metadata + graph) | Retrieval API callable by WS2 |
| 14 | Help WS2 with analyst synthesis data needs | - |
| 17 | `bootstrap_demo_project.py`: pre-ingest a real product corpus | Demo-ready data |
| 20-21 | End-to-end integration with WS2 + WS3 | Full pipeline working |

## Testing Checklist

- [ ] `fetch.py` handles 404s, timeouts, and non-HTML gracefully
- [ ] `chunk.py` produces stable chunk IDs across reruns
- [ ] Chroma collection persists across process restarts
- [ ] `retrieve()` returns results filtered by facet and stance
- [ ] Graph parquet files load in pandas without errors
- [ ] Leiden communities are seeded (deterministic with `RANDOM_SEED=42`)
- [ ] Demo corpus ingests end-to-end in under 2 minutes
