import { getPersonaColor, sentimentClasses } from "../lib/colors";
import type { QuoteCard } from "../lib/types";

interface QuoteWallProps {
  quotes: QuoteCard[];
}

export function QuoteWall({ quotes }: QuoteWallProps) {
  if (quotes.length === 0) {
    return (
      <div className="card-dia p-8 text-center text-[rgba(0,0,0,0.4)]">
        No quotes available.
      </div>
    );
  }

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Quote Wall</h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">Memorable lines from the panel</p>
      <div className="mt-5 columns-1 gap-4 md:columns-2">
        {quotes.map((q, i) => (
          <article key={`${q.persona_id}-${i}`} className="mb-4 break-inside-avoid rounded-2xl border border-[rgba(0,0,0,0.06)] p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPersonaColor(q.persona_id)}`}>
                {q.segment_label}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${sentimentClasses[q.sentiment] ?? sentimentClasses.neutral}`}>
                {q.sentiment}
              </span>
            </div>
            <p className="font-[family-name:var(--font-display)] text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.7)]">"{q.quote}"</p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[rgba(0,0,0,0.35)] capitalize">{q.facet}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
