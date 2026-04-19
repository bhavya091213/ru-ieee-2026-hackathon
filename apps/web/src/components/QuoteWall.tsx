import { getPersonaColor, sentimentClasses } from "../lib/colors";
import type { QuoteCard } from "../lib/types";

interface QuoteWallProps {
  quotes: QuoteCard[];
}

export function QuoteWall({ quotes }: QuoteWallProps) {
  if (quotes.length === 0) {
    return (
      <div className="card p-6 text-center text-[var(--color-text-faint)]">
        No quotes available.
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Quote Wall</h2>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">Memorable lines from the panel</p>
      <div className="mt-4 columns-1 gap-4 md:columns-2">
        {quotes.map((q, i) => (
          <article key={`${q.persona_id}-${i}`} className="mb-4 break-inside-avoid border border-[var(--color-surface-border)] bg-[var(--color-bg-deep)] p-4 rounded-lg">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-bold ${getPersonaColor(q.persona_id)}`}>
                {q.segment_label}
              </span>
              <span className={`border px-2.5 py-0.5 text-xs capitalize ${sentimentClasses[q.sentiment] ?? sentimentClasses.neutral}`}>
                {q.sentiment}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-text-dim)] italic">"{q.quote}"</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)] capitalize">{q.facet}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
