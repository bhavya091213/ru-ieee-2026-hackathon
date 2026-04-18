Good -- this is a greenfield project. Now I have all the context I need to generate the section content.

# Section 10: Graph Editor (EvidenceGraph + ScenarioEditor)

## Overview

This section implements two P2 stretch components: **EvidenceGraph** and **ScenarioEditor**. The EvidenceGraph visualizes entity relationships (products, features, concerns, competitors, segments) as an interactive force-directed graph using `react-force-graph-2d`. The ScenarioEditor provides a hypothesis management UI with a "Re-run Simulation" button. Both components live in the `apps/web/src/components/` directory.

**Priority:** P2 (stretch goal). These components enhance the demo but are not required for the core dashboard to function.

## Dependencies

- **section-01-scaffold**: Vite + React + TypeScript project with `react-force-graph-2d` installed
- **section-02-types-mock**: `DashboardPayload` type (including graph data shape), mock data, `colors.ts`
- **section-03-api-hooks**: `api.runSimulation(projectId)` function, `useProject` hook for simulation state

## File Paths

| File | Action |
|------|--------|
| `apps/web/src/components/EvidenceGraph.tsx` | Create |
| `apps/web/src/components/EvidenceGraph.test.tsx` | Create |
| `apps/web/src/components/ScenarioEditor.tsx` | Create |
| `apps/web/src/components/ScenarioEditor.test.tsx` | Create |

## Background Context

### Graph Data Shape

The `DashboardPayload` from the WS2 API may include a `graph` field containing entity-relationship data. The graph data is transformed into the format expected by `react-force-graph-2d`:

- **Nodes**: `{ id: string, name: string, type: string, description: string, val: number }` where `val` controls the rendered node size.
- **Links**: `{ source: string, target: string, type: string }` describing relationships between nodes.

Node `type` values and their assigned colors:
- `Product` -- blue-500 (`#3b82f6`)
- `Feature` -- green-500 (`#22c55e`)
- `Concern` -- red-500 (`#ef4444`)
- `Competitor` -- orange-500 (`#f97316`)
- `Segment` -- purple-500 (`#a855f7`)

### ScenarioEditor Context

The current `/simulate` endpoint does not accept hypotheses as input -- hypotheses are part of the project creation payload. The ScenarioEditor's "Re-run" button triggers a fresh simulation with the existing project data. To change hypotheses, the user must create a new project. This is acceptable for hackathon scope. The chip display is for visual editing UX, but the values are not sent to the API on re-run.

### react-force-graph-2d API

The library provides a `ForceGraph2D` React component. Key props used:

- `graphData`: `{ nodes: Node[], links: Link[] }`
- `nodeColor`: callback `(node) => string` to determine node fill color
- `nodeLabel`: callback `(node) => string` for hover tooltip
- `onNodeClick`: callback `(node, event) => void`
- `onBackgroundClick`: callback `(event) => void`
- `warmupTicks`: number of simulation ticks to run before rendering (50)
- `cooldownTicks`: ticks after which the simulation stops (100)
- `nodeVal`: callback `(node) => number` or the field name for node size

## Tests (Write First)

### `apps/web/src/components/EvidenceGraph.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvidenceGraph } from './EvidenceGraph';

/**
 * Mock react-force-graph-2d since it depends on canvas/WebGL
 * which is unavailable in jsdom. The mock captures props so
 * tests can assert on data transformations and callbacks.
 */

const mockForceGraph = vi.fn(() => null);
vi.mock('react-force-graph-2d', () => ({
  default: (props: any) => {
    mockForceGraph(props);
    // Render a testable placeholder with node data
    return (
      <div data-testid="force-graph">
        {props.graphData?.nodes?.map((n: any) => (
          <div
            key={n.id}
            data-testid={`node-${n.id}`}
            data-type={n.type}
            onClick={() => props.onNodeClick?.(n)}
          >
            {n.name}
          </div>
        ))}
        <div
          data-testid="graph-background"
          onClick={() => props.onBackgroundClick?.()}
        />
      </div>
    );
  },
}));

describe('EvidenceGraph', () => {
  /** Sample graph data for tests */
  const sampleGraphData = {
    nodes: [
      { id: '1', name: 'SmartPhone X', type: 'Product', description: 'The main product', val: 10 },
      { id: '2', name: 'Camera', type: 'Feature', description: 'Camera feature', val: 5 },
      { id: '3', name: 'Privacy Risk', type: 'Concern', description: 'Data privacy concern', val: 5 },
      { id: '4', name: 'Competitor Y', type: 'Competitor', description: 'Main competitor', val: 5 },
      { id: '5', name: 'Early Adopters', type: 'Segment', description: 'Tech enthusiasts', val: 5 },
    ],
    links: [
      { source: '1', target: '2', type: 'has_feature' },
      { source: '1', target: '3', type: 'has_concern' },
    ],
  };

  it('renders react-force-graph-2d component', () => {
    /** Verify the ForceGraph2D mock is rendered in the DOM */
  });

  it('nodes are colored by type (Product=blue, Feature=green, Concern=red, Competitor=orange, Segment=purple)', () => {
    /**
     * Render with sampleGraphData, then inspect the nodeColor
     * callback passed to ForceGraph2D. Call it for each node type
     * and assert the correct hex color is returned.
     */
  });

  it('clicking a node opens side panel with entity details', () => {
    /**
     * Render EvidenceGraph, click a node element, assert the side
     * panel appears containing the node's name, type, and description.
     */
  });

  it('clicking background closes side panel', () => {
    /**
     * Open the side panel by clicking a node, then click the
     * background element, assert the side panel is no longer visible.
     */
  });

  it('renders without crashing when graph data has 50+ nodes', () => {
    /**
     * Generate an array of 55 nodes and some links. Render the
     * component and verify no error is thrown. The component should
     * limit to 50 nodes for performance.
     */
  });

  it('renders empty state when no graph data available', () => {
    /**
     * Pass null/undefined/empty graph data. Assert a placeholder
     * message like "No graph data available" is rendered instead
     * of the force graph.
     */
  });
});
```

### `apps/web/src/components/ScenarioEditor.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioEditor } from './ScenarioEditor';

describe('ScenarioEditor', () => {
  it('renders text input and submit button', () => {
    /**
     * Render ScenarioEditor with required props. Assert a text
     * input and a "Re-run Simulation" button are present.
     */
  });

  it('adding text and pressing Enter creates a new chip', () => {
    /**
     * Type a hypothesis into the input, press Enter. Assert
     * a chip element appears with the hypothesis text.
     */
  });

  it('clicking X on a chip removes it', () => {
    /**
     * Add a chip, then click its X/remove button. Assert the
     * chip is no longer in the document.
     */
  });

  it('Re-run button calls runSimulation', () => {
    /**
     * Pass a mock onRerun callback. Click the "Re-run Simulation"
     * button. Assert the callback was invoked.
     */
  });

  it('Re-run button is disabled during simulation (loading state)', () => {
    /**
     * Pass isSimulating=true prop. Assert the "Re-run Simulation"
     * button has the disabled attribute.
     */
  });
});
```

## Implementation Details

### EvidenceGraph Component

**File:** `apps/web/src/components/EvidenceGraph.tsx`

This component renders an interactive force-directed graph using `react-force-graph-2d`. Key implementation points:

**Props interface:**

```typescript
interface EvidenceGraphProps {
  graphData?: {
    nodes: Array<{ id: string; name: string; type: string; description: string; val: number }>;
    links: Array<{ source: string; target: string; type: string }>;
  } | null;
}
```

**Empty state guard:** If `graphData` is null, undefined, or has an empty `nodes` array, render a placeholder card with "No graph data available" text. Do not attempt to render the force graph.

**Node color map:** Define a constant map from node type to color string:

```typescript
const NODE_COLORS: Record<string, string> = {
  Product: '#3b82f6',
  Feature: '#22c55e',
  Concern: '#ef4444',
  Competitor: '#f97316',
  Segment: '#a855f7',
};
```

Pass a `nodeColor` callback to `ForceGraph2D` that looks up `node.type` in this map, falling back to a default gray (`#94a3b8`) for unknown types.

**Performance constraints:**
- Limit to 50 nodes maximum. If the input data has more than 50 nodes, sort by `val` descending and take the top 50. Filter links to only include those whose `source` and `target` are both in the retained node set.
- Set `warmupTicks={50}`, `cooldownTicks={100}` on the ForceGraph2D component.
- Memoize the processed graph data with `useMemo` keyed on the input `graphData`.
- Memoize all callback props (`onNodeClick`, `onBackgroundClick`, `nodeColor`) with `useCallback`.

**Side panel state:** Use `useState<SelectedNode | null>(null)` to track the currently selected node. When a node is clicked, set this state to the clicked node. When the background is clicked, set it to null.

**Side panel rendering:** Conditionally render a panel (absolutely positioned or in a flex layout to the right of the graph) showing:
- Entity name in bold
- Type as a small colored chip (using the same color map)
- Description paragraph
- "Linked Source Chunks" section listing any related chunk texts (if available from the node data)
- A close button (X) that sets selectedNode to null

**Styling:** The graph container should be `rounded-xl bg-slate-800 p-4 shadow-lg` with a fixed or responsive height (e.g., `h-[400px]`). The side panel slides in with a transition. The overall component should be wrapped in the ErrorBoundary from section-01.

### ScenarioEditor Component

**File:** `apps/web/src/components/ScenarioEditor.tsx`

This component provides hypothesis chip management and a simulation re-run trigger.

**Props interface:**

```typescript
interface ScenarioEditorProps {
  hypotheses?: string[];
  onRerun: () => void;
  isSimulating: boolean;
  projectId: string | null;
}
```

**State:** Maintain a local `chips: string[]` state initialized from the `hypotheses` prop (or empty array). Track the text input value with a separate state variable.

**Chip management:**
- On Enter keypress or button click with non-empty input, add the trimmed text to the chips array and clear the input.
- Each chip renders as a small rounded pill with the hypothesis text and an X button.
- Clicking X removes that chip from the array (filter by index, not value, to handle duplicates).

**Re-run button:**
- Label: "Re-run Simulation"
- When clicked, calls the `onRerun` callback prop.
- When `isSimulating` is true, the button is disabled and shows a loading indicator (spinner or "Running..." text).
- When `projectId` is null, the button should also be disabled.

**Styling:** Card wrapper with `rounded-xl bg-slate-800 p-6 shadow-lg`. Input styled with dark theme (`bg-slate-700 text-white rounded-lg px-4 py-2`). Chips styled as `inline-flex items-center gap-1 bg-slate-600 text-sm text-white rounded-full px-3 py-1`. The re-run button uses `bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`.

### Integration in ProjectDashboard

Both components are placed in the dashboard grid layout (defined in section-12). Their grid positions:
- Row 3: `[FeatureHeatmap - 1/2 width] [EvidenceGraph - 1/2 width]`
- Row 5: `[ScenarioEditor - 1/2 width] [TribePanel - 1/2 width]`

The EvidenceGraph receives `graphData` from the `DashboardPayload.graph` field. The ScenarioEditor receives `hypotheses` from the payload, `onRerun` wired to `useProject.simulate()`, and `isSimulating` from `useProject.status === 'simulating'`.

## Memoization Strategy

The force graph is computationally expensive. All data transformations and callbacks must be memoized:

1. **`graphData` processing** (node limiting, link filtering): Wrap in `useMemo` with `[props.graphData]` as the dependency.
2. **`nodeColor` callback**: Wrap in `useCallback` with no dependencies (it references only the constant `NODE_COLORS` map).
3. **`onNodeClick` callback**: Wrap in `useCallback` with `[setSelectedNode]` or equivalent setter as dependency.
4. **`onBackgroundClick` callback**: Wrap in `useCallback` with `[setSelectedNode]` as dependency.

## Edge Cases to Handle

- **Graph data is null/undefined**: Render placeholder, do not mount ForceGraph2D.
- **Graph data has zero nodes**: Render placeholder.
- **Graph data has more than 50 nodes**: Truncate to top 50 by `val` and filter links accordingly.
- **Node type not in color map**: Fall back to slate-400 (`#94a3b8`).
- **ScenarioEditor with empty initial hypotheses**: Render empty chip area, input still functional.
- **Duplicate hypothesis text**: Allow duplicates (remove by index, not value).
- **Re-run clicked with no projectId**: Button should be disabled; no API call made.