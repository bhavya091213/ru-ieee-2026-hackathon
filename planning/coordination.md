# PanelForge: Coordination Map

## Team

| Workstream | Owner | Focus |
|------------|-------|-------|
| **WS1** - Data Pipeline & Graph Memory | Friend A | Ingestion, chunking, embeddings, Chroma, graph, retrieval |
| **WS2** - AI Engine | You (Bhavya) | Schemas, Gemini extraction, personas, simulation, TRIBE, API |
| **WS3** - Frontend Dashboard | Friend B | React dashboard, charts, graph viz, demo polish |

## Dependency Timeline (Critical Handoffs)

```
Hour 0   ──── All: env setup, goals locked ────────────────────────────

Hour 1   WS2 ships schemas ──────────> WS1 + WS3 can start building
         (Pydantic models,              against real types
          TypeScript types)

Hour 4   WS2 ships extraction ───────> WS1 uses extraction output
         schemas + prompt               to populate graph fields

Hour 5   WS1 ships chunk JSONL ──────> WS2 can test extraction
         format + sample data           pipeline on real chunks

Hour 8   WS3 has mock data ─────────> WS3 builds all components
         dashboard running              independently from here

Hour 10  WS1 ships retrieve() ───────> WS2 can run full simulation
         API                            with real evidence

Hour 15  WS2 ships API endpoints ────> WS3 swaps mock data for
                                        real API calls

Hour 17  WS1 ships demo corpus ──────> All: demo data ready

Hour 20  ──── All: end-to-end integration ─────────────────────────────

Hour 22  ──── All: pitch + rehearsal ──────────────────────────────────
```

## Blocking Handoffs (Don't Miss These)

| Hour | From | To | What | If Late |
|------|------|----|------|---------|
| **1** | WS2 | WS1, WS3 | Pydantic schemas + TS types | WS1 can't build graph fields, WS3 can't type mock data |
| **4** | WS2 | WS1 | Extraction schemas + Gemini prompt | WS1 builds graph with placeholder fields, patches later |
| **10** | WS1 | WS2 | `retrieve()` function working | WS2 uses hardcoded chunk lists as retrieval mock |
| **15** | WS2 | WS3 | FastAPI endpoints returning real data | WS3 stays on mock data, connects at hour 20 |

## Non-Overlapping Ownership

| Area | Owner | Others Touch? |
|------|-------|---------------|
| URL fetching, scraping, Markdown writing | WS1 only | No |
| Chunking, embedding, Chroma | WS1 only | No |
| Graph construction, parquet, communities | WS1 only | No |
| Retrieval API (`retrieve()`) | WS1 only | WS2 calls it |
| All Pydantic/TS schemas | WS2 only | WS1 + WS3 consume |
| Gemini prompts + structured output | WS2 only | No |
| Persona synthesis + simulation loop | WS2 only | No |
| FastAPI routes | WS2 only | WS3 calls them |
| TRIBE integration | WS2 only | WS3 renders output |
| React components + Tailwind styling | WS3 only | No |
| Charts (Recharts) | WS3 only | No |
| Graph visualization (react-force-graph) | WS3 only | No |
| Demo visual polish | WS3 only | No |

## Shared Boundary: `/data/` Directory

```
data/
  raw/        # WS1 writes
  md/         # WS1 writes
  chunks/     # WS1 writes, WS2 reads
  graph/      # WS1 writes, WS2 reads
  vectors/    # WS1 writes + reads
  cache/      # WS2 writes (Gemini response cache)
  runs/       # WS2 writes (simulation artifacts), WS3 reads via API
```

## Environment Setup (Hour 0, All)

```bash
# Clone + branch
git clone <repo>
cd panelforge

# Backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd apps/web
npm install
npm run dev

# Env vars (.env)
GEMINI_API_KEY=...
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
REDDIT_USER_AGENT=panelforge/0.1
YOUTUBE_API_KEY=...
RANDOM_SEED=42
PYTHONHASHSEED=42
```

## Risk Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| TRIBE model OOMs or won't load | High | Feature-flag off from start. Only attempt at hour 18. |
| Gemini rate limits during demo | Medium | Cache all Gemini responses. Pre-run demo scenario at hour 21. |
| Reddit/YouTube API credentials missing | Medium | Include 3-5 pre-fetched .md files in demo corpus as fallback. |
| Integration breaks at hour 20 | Medium | Each workstream has mock/fallback data. Frontend works standalone. |
| Leiden community detection is slow | Low | Fall back to k-means with k=5. |
| Graph too large for force-graph | Low | Limit to top 50 entities by degree for visualization. |

## Pre-Baked Demo Strategy

By hour 17, WS1 should have a fully ingested corpus for **one real product** (suggestion: a recent phone launch with lots of pre-launch discussion). WS2 pre-runs the full simulation. WS3 loads this data on startup. The demo shows:

1. The pre-computed dashboard (instant, no waiting)
2. Then live: add one new hypothesis and re-run (shows the system is real, not just screenshots)

This two-step demo eliminates the risk of a slow live pipeline while still proving it works.
