Now I have all the context needed. Let me produce the section content.

# Section 07 — QuoteWall Component

## Overview

This section implements the `QuoteWall` component, a masonry-style grid of quote cards extracted from synthetic focus group responses. Each card displays a quote attributed to a persona, tagged with a facet label and sentiment indicator. The wall provides at-a-glance evidence of what personas said and how they felt, making it a core P0 component for the demo dashboard.

The QuoteWall is a read-only visualization component with no internal state management or API calls. It receives data as props and renders a CSS column-based masonry layout.

## Dependencies

This section depends on:

- **section-01-scaffold**: Vite + React + Tailwind project must be initialized and buildable.
- **section-02-types-mock**: The `QuoteCard` type definition in `types.ts`, mock data in `mockData.ts`, and the `getPersonaColor` function from `colors.ts` must exist.

No dependency on section-03 (API hooks) is needed because QuoteWall receives its data as props rather than fetching it directly.

## File Paths

| File | Action |
|------|--------|
| `apps/web/src/components/QuoteWall.tsx` | Create |
| `apps/web/src/components/QuoteWall.test.tsx` | Create |

## Relevant Type Definitions

The component consumes `QuoteCard` objects. For reference, the expected shape from `types.ts` (defined in section-02):

```typescript
interface QuoteCard {
  persona_id: string;
  segment_label: string;
  facet: string;
  sentiment: string; // "positive" | "negative" | "neutral"
  text: string;
}
```

The component also uses `getPersonaColor(persona_id: string): string` from `colors.ts` (defined in section-02) to assign the left-border color to each card.

## Tests (Write First)

Create the test file at `apps/web/src/components/QuoteWall.test.tsx`. All tests should be written before implementation. The tests use Vitest and React Testing Library.

### Test: Renders a card for each quote in the payload

Render the QuoteWall with an array of N quote objects. Assert that the DOM contains exactly N card elements. Use a `data-testid="quote-card"` attribute on each card container for easy querying.

### Test: Each card shows quote text, persona label, facet chip, and sentiment icon

Render with a single known quote (e.g., `{ text: "Great camera quality", segment_label: "Early Adopter", facet: "camera", sentiment: "positive", persona_id: "p1" }`). Assert:
- The quote text "Great camera quality" appears in the document.
- The segment label "Early Adopter" appears.
- The facet label "camera" appears.
- A sentiment indicator is present. For "positive" sentiment, assert the presence of a thumbs-up icon (use an accessible `aria-label="positive"` or `data-testid="sentiment-positive"` to locate it).

### Test: Cards have left border in persona's assigned color

Render with quotes from different personas. For each card, inspect the inline `style` attribute or computed border-left-color. Assert it matches the return value of `getPersonaColor(persona_id)` for the respective persona.

Implementation note: Since Tailwind's `border-l-4` sets the border width but the color must be dynamic (persona-specific), use an inline `style={{ borderLeftColor: getPersonaColor(quote.persona_id) }}` on each card. The test should verify this inline style is applied.

### Test: Renders empty state when quotes array is empty

Render the QuoteWall with `quotes={[]}`. Assert that no quote cards are rendered and instead a placeholder message appears (e.g., text containing "No quotes available" or similar). Use `getByText` or `queryByTestId("quote-wall-empty")` to verify.

### Test stub signatures

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuoteWall from "./QuoteWall";

describe("QuoteWall", () => {
  it("renders a card for each quote in the payload", () => {
    // Render with N quotes, assert N cards via data-testid="quote-card"
  });

  it("each card shows quote text, persona label, facet chip, and sentiment icon", () => {
    // Render with a single known quote, assert text/label/facet/sentiment present
  });

  it("cards have left border in persona's assigned color", () => {
    // Render with quotes from different personas
    // Assert each card's borderLeftColor matches getPersonaColor(persona_id)
  });

  it("renders empty state when quotes array is empty", () => {
    // Render with empty array, assert placeholder visible, no cards
  });
});
```

## Implementation Details

### Component: `QuoteWall.tsx`

**Props interface:**

```typescript
interface QuoteWallProps {
  quotes: QuoteCard[];
}
```

**Masonry layout using CSS columns:**

The outer container uses Tailwind's CSS column utilities to create a masonry-like layout without JavaScript:

```
columns-2 lg:columns-3 gap-4
```

This creates 2 columns by default and 3 columns at the `lg` breakpoint (1024px+). Items flow top-to-bottom within each column, then wrap to the next column, producing a Pinterest-style masonry effect.

**Individual quote card styling:**

Each card uses these Tailwind classes:
- `rounded-xl bg-slate-800 p-4 shadow-lg` -- rounded dark card with padding and shadow
- `break-inside-avoid` -- prevents the card from being split across CSS columns
- `mb-4` -- bottom margin to create spacing between vertically stacked cards within a column
- `border-l-4` -- 4px left border (color applied via inline style)

The left border color is set dynamically using an inline style:
```
style={{ borderLeftColor: getPersonaColor(quote.persona_id) }}
```

**Card internal structure:**

1. **Quote text body** -- The main quote text, displayed as a paragraph. Use `text-slate-200` for readability on the dark background.

2. **Bottom metadata row** -- A flex row at the bottom of the card containing:
   - **Segment label chip**: Small rounded pill showing `quote.segment_label`. Styled with `text-xs bg-slate-700 rounded-full px-2 py-0.5`.
   - **Facet chip**: Small rounded pill showing `quote.facet`. Same chip styling.
   - **Sentiment icon**: A visual indicator of sentiment. Use simple Unicode or SVG icons:
     - `"positive"` -- thumbs up icon (e.g., a small SVG or the Unicode character). Add `data-testid="sentiment-positive"`.
     - `"negative"` -- thumbs down icon. Add `data-testid="sentiment-negative"`.
     - `"neutral"` -- neutral/dash icon. Add `data-testid="sentiment-neutral"`.

**Empty state:**

When the `quotes` array is empty, render a placeholder instead of the masonry layout. The placeholder should be a centered card with muted text such as "No quotes available" inside a `data-testid="quote-wall-empty"` container. Style it similarly to other empty states in the dashboard (e.g., `rounded-xl bg-slate-800 p-8 text-slate-400 text-center`).

**Sentiment icon approach:**

For the sentiment icons, keep the implementation simple. Inline SVG or small functional components for thumbs-up/thumbs-down/neutral are sufficient. Do not pull in an icon library for just three icons. Each icon should have an appropriate `aria-label` matching the sentiment value for accessibility and testability.

### Component structure (pseudocode)

```
QuoteWall({ quotes })
  if quotes.length === 0:
    return <empty state placeholder>

  return (
    <div className="columns-2 lg:columns-3 gap-4">
      {quotes.map(quote =>
        <div
          key={unique key}
          data-testid="quote-card"
          className="rounded-xl bg-slate-800 p-4 shadow-lg break-inside-avoid mb-4 border-l-4"
          style={{ borderLeftColor: getPersonaColor(quote.persona_id) }}
        >
          <p>{quote.text}</p>
          <div className="flex items-center gap-2 mt-3">
            <span chip>{quote.segment_label}</span>
            <span chip>{quote.facet}</span>
            <SentimentIcon sentiment={quote.sentiment} />
          </div>
        </div>
      )}
    </div>
  )
```

### Sentiment icon helper

Create a small helper (either inline or as a private sub-component within the same file) that maps a sentiment string to the appropriate icon:

```typescript
function SentimentIcon({ sentiment }: { sentiment: string }): JSX.Element
```

This function returns a small SVG element with:
- `aria-label={sentiment}` for accessibility
- `data-testid={`sentiment-${sentiment}`}` for testing
- Appropriate color: green for positive, red for negative, slate/gray for neutral

### Key for list rendering

Use a combination of `persona_id` and index (or `persona_id + facet + text snippet`) as the React key for each quote card, since the data model does not guarantee a unique `id` field on `QuoteCard`.

## Integration Notes

The QuoteWall is placed in the `ProjectDashboard.tsx` grid layout (section-12 integration) at Row 4 alongside the PersonaTable, occupying one half of the 2-column grid at the `xl` breakpoint. It receives its quotes from the `DashboardPayload.quotes` array passed down from the `useDashboard` hook.

Example usage in the dashboard (for context, not to implement here):

```tsx
<QuoteWall quotes={data.quotes} />
```

No additional wiring, context providers, or state management is needed. The component is purely presentational.