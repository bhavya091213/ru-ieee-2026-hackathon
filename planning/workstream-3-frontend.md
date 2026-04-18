# Workstream 3: Frontend Dashboard & Demo Polish

**Owner:** Friend B
**Hours:** 3-19 (active), 20-23 (integration + rehearsal)

## Mission

Build a judge-ready React dashboard that makes the whole system feel like a polished product. From hour 8 onward, this workstream should be producing visual output that makes the demo compelling. Every panel should tell a story on its own.

## Deliverables

| # | Deliverable | Target Hour | Depends On |
|---|-------------|-------------|------------|
| 1 | Vite + React + Tailwind + routing scaffold | 3 | - |
| 2 | IngestForm component (product name, URLs, hypotheses) | 5 | WS2 API schema (hour 2) |
| 3 | Project status / loading states | 7 | - |
| 4 | KPI cards (consensus, disagreement, evidence coverage) | 8 | WS2 DashboardPayload schema |
| 5 | Persona table (sortable, expandable) | 10 | WS2 PersonaSummary schema |
| 6 | Consensus/disagreement charts (Recharts) | 12 | (4) |
| 7 | Feature tradeoff heatmap | 13 | WS2 feature_scores |
| 8 | Quote wall (masonry cards) | 14 | WS2 QuoteCard schema |
| 9 | Evidence graph explorer (react-force-graph) | 15 | WS1 graph data via API |
| 10 | TRIBE panel (sparkline + caveat label) | 19 | WS2 TribeResult |
| 11 | Scenario editor (add/edit hypotheses, re-run) | 16 | WS2 simulate endpoint |
| 12 | Demo polish: animations, responsive, screenshot-ready | 18-19 | Everything |

## Files You Own

```
apps/
  web/
    index.html
    package.json
    vite.config.ts
    tailwind.config.ts
    tsconfig.json
    src/
      main.tsx
      App.tsx
      pages/
        HomePage.tsx            # Create project form
        ProjectDashboard.tsx    # Main dashboard view
      components/
        Header.tsx              # Nav + project selector
        IngestForm.tsx          # Product name, seed URLs, hypotheses
        StatusBar.tsx           # Pipeline progress indicator
        KPICards.tsx            # Consensus %, disagreement %, coverage %
        PersonaTable.tsx        # Sortable table with expand for beliefs
        PersonaDetailModal.tsx  # Deep-dive on one persona
        ConsensusChart.tsx      # Stacked bar / gauge chart
        DisagreementRadar.tsx   # Radar chart of disagreement axes
        FeatureHeatmap.tsx      # Facet x persona heatmap
        QuoteWall.tsx           # Masonry grid of quotable sentences
        EvidenceGraph.tsx       # Force-directed graph viz
        ScenarioEditor.tsx      # Add hypotheses, trigger re-simulate
        TribePanel.tsx          # Sparkline + response metrics + caveat
        RoundComparison.tsx     # Round 1 vs Round 2 side-by-side
      lib/
        api.ts                  # Typed fetch wrappers for all endpoints
        types.ts                # Frontend TypeScript types (mirror WS2 schemas)
      hooks/
        useProject.ts           # Project state + polling
        useDashboard.ts         # Dashboard data fetching
```

## Interface Contracts

### What you consume (from WS2 API)

**API Endpoints:**
```
POST /api/projects                        -> { project_id: string }
POST /api/projects/{id}/ingest            -> { status, source_count, chunk_count }
POST /api/projects/{id}/simulate          -> DashboardPayload
GET  /api/projects/{id}/dashboard         -> DashboardPayload
POST /api/projects/{id}/tribe/score       -> TribeResult
```

**DashboardPayload (TypeScript mirror):**
```typescript
interface DashboardPayload {
  project_id: string;
  scenario_id: string;
  consensus_score: number;        // 0-1
  disagreement_score: number;     // 0-1
  evidence_coverage: number;      // 0-1
  top_risks: ScoredLabel[];
  top_wins: ScoredLabel[];
  feature_scores: Record<string, FeatureScoreRow>;
  personas: PersonaSummary[];
  quotes: QuoteCard[];
  round1_responses: PersonaResponse[];
  round2_responses: PersonaResponse[];
  moderator_question: string;
  analyst_summary: AnalystSummary;
  tribe: TribeResult | null;
}

interface PersonaSummary {
  persona_id: string;
  segment_label: string;
  summary: string;
  adoption_likelihood: number;    // 0-100
  strongest_positive: string;
  strongest_concern: string;
  feature_priorities: Record<string, number>;
}

interface QuoteCard {
  persona_id: string;
  segment_label: string;
  quote: string;
  facet: string;
  sentiment: string;
}

interface ScoredLabel {
  label: string;
  score: number;
}

interface TribeResult {
  enabled: boolean;
  response_strength: number;
  response_variance: number;
  response_spread: number;
  scored_text: string;
}

interface AnalystSummary {
  consensus_themes: string[];
  disagreement_themes: string[];
  top_risks: ScoredLabel[];
  top_wins: ScoredLabel[];
  feature_recommendations: string[];
  messaging_suggestions: string[];
  evidence_gaps: string[];
}
```

### What you produce

- A visually polished single-page app at `http://localhost:5173`
- Mock data mode (hardcoded JSON) for development before API is ready
- Screenshots for pitch deck

## Key Technical Decisions

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS 4** for styling (dark theme, clean cards)
- **Recharts** for bar charts, radar charts, gauges
- **react-force-graph** for the evidence graph explorer
- **No state management library** - React state + context is enough for this scope
- API base URL from env var (`VITE_API_URL=http://localhost:8000`)
- Mock data fallback: every component should render with hardcoded data if API is down

## Wireframe Reference

```
+----------------------------------------------------------------------+
| PanelForge    [project selector]                        [New Project] |
+----------------------------------------------------------------------+
| iPhone 18 Synthetic Focus Group                                      |
| 126 sources | 5 personas | 2 rounds | TRIBE: on                     |
+----------------------------------------------------------------------+
|                                                                      |
|  [Consensus 61%]    [Disagreement 34%]    [Evidence Coverage 89%]    |
|                                                                      |
+----------------------------------+-----------------------------------+
|                                  |                                   |
|  Feature Risk Matrix             |  Evidence Graph                   |
|  Heatmap: facet x persona       |  Force-directed: entities +       |
|  Color: green (positive) to     |  relationships, click to          |
|  red (concern)                   |  see source chunks                |
|                                  |                                   |
+----------------------------------+-----------------------------------+
|                                  |                                   |
|  Persona Table                   |  Quote Wall                       |
|  [expand row for beliefs +       |  Masonry cards with persona       |
|   round1 vs round2 comparison]   |  avatar color, facet tag,         |
|                                  |  sentiment indicator              |
|                                  |                                   |
+----------------------------------+-----------------------------------+
|                                  |                                   |
|  Scenario Editor                 |  TRIBE Panel                      |
|  + Add hypothesis                |  Response strength sparkline      |
|  [Re-run simulation]             |  "Exploratory signal - not a      |
|                                  |   validated product KPI"          |
|                                  |                                   |
+----------------------------------+-----------------------------------+
```

## Component Specifications

### KPICards
- Three large number cards with labels
- Color coding: green (>0.7), yellow (0.4-0.7), red (<0.4) for consensus
- Inverse colors for disagreement (red = high disagreement)
- Animate on load

### PersonaTable
- Columns: Avatar color dot, Segment Label, Adoption Likelihood (bar), Top Positive, Top Concern
- Sortable by adoption likelihood
- Click row to expand: show feature_priorities as mini bar chart, beliefs list, round 1 vs round 2 comparison

### ConsensusChart + DisagreementRadar
- ConsensusChart: horizontal stacked bar showing agreement breakdown by facet
- DisagreementRadar: radar chart with axes = facets, values = disagreement intensity per facet

### FeatureHeatmap
- Rows = personas, Columns = facets (camera, battery, price, design, privacy, ecosystem)
- Cell color = feature_priorities score (0-1)
- Add a "risk" overlay row from top_risks

### QuoteWall
- Masonry layout, 2-3 columns
- Each card: colored left border (persona color), quote text, persona label, facet chip, sentiment icon
- Click to see source evidence

### EvidenceGraph
- Nodes: entities colored by type (Product=blue, Feature=green, Concern=red, Competitor=orange, Segment=purple)
- Edges: relationship types as different line styles
- Click node: show description + linked chunks in a side panel
- Zoom/pan enabled

### TribePanel
- Only visible when `tribe` is non-null
- Three mini metrics: strength, variance, spread
- Small sparkline or bar
- Prominent caveat text: "Exploratory cortical-response signal. Not a validated product metric."

### ScenarioEditor
- Text input for new hypotheses
- Chip display for existing hypotheses
- "Re-run Simulation" button that POSTs to `/simulate` and refreshes dashboard

## Hour-by-Hour

| Hour | Task | Output |
|------|------|--------|
| 3 | Vite + React + Tailwind + Recharts + react-force-graph scaffold | App boots, shows placeholder |
| 4 | Routing: HomePage + ProjectDashboard pages | Navigation works |
| 5 | IngestForm component + `api.ts` typed fetch wrappers | Can submit project (mock or real) |
| 6 | `types.ts`: mirror all WS2 TypeScript types + mock data JSON | - |
| 7 | StatusBar + loading/error states | Polished loading UX |
| 8 | KPICards with mock data | Three big numbers rendering |
| 9 | PersonaTable (sortable, expandable rows) | Table with mock personas |
| 10 | PersonaDetailModal | Click persona -> detail view |
| 11 | ConsensusChart (Recharts stacked bar) | Chart rendering |
| 12 | DisagreementRadar (Recharts radar) | Radar chart rendering |
| 13 | FeatureHeatmap (custom grid component) | Heatmap rendering |
| 14 | QuoteWall (masonry layout) | Quote cards rendering |
| 15 | EvidenceGraph (react-force-graph) | Interactive graph |
| 16 | ScenarioEditor (hypothesis chips + re-run button) | Can trigger re-simulation |
| 17 | Connect all components to real API (replace mock data) | Real data flowing |
| 18 | Visual polish: animations, transitions, responsive tweaks | Demo-ready |
| 19 | TribePanel (if WS2 has it working) or placeholder | TRIBE widget |
| 20-21 | End-to-end integration testing with real pipeline | Everything connected |
| 22-23 | Screenshots for pitch + rehearsal | Pitch materials |

## Visual Design Notes

- **Dark theme** (slate-900 background, slate-800 cards, white text)
- **Accent colors:** blue-500 primary, green-500 positive, red-500 concern, amber-500 neutral
- **Persona colors:** assign each persona a distinct muted color (used in table, quotes, graph)
- **Typography:** Inter or system font, large KPI numbers (text-4xl), clean labels
- Card radius: rounded-xl, subtle shadow (shadow-lg)
- Consistent spacing: p-6 cards, gap-6 grid

## Testing Checklist

- [ ] All components render with mock data (no API dependency)
- [ ] API integration: create project -> ingest -> simulate -> dashboard shows results
- [ ] Persona table sorts correctly by adoption likelihood
- [ ] Evidence graph renders without crashing on 50+ nodes
- [ ] TRIBE panel hidden when tribe is null
- [ ] Responsive at 1280px and 1920px widths
- [ ] No console errors in production build
- [ ] Screenshots captured for pitch deck
