import { getPersonaColor, sentimentClasses } from "../lib/colors";
import type { QuoteCard } from "../lib/types";

interface QuoteWallProps {
  quotes: QuoteCard[];
}

export function QuoteWall({ quotes }: QuoteWallProps) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center text-gray-400">
        No quotes available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Quote Wall</h2>
      <p className="mt-1 text-sm text-gray-500">Memorable lines from the panel</p>
      <div className="mt-4 columns-1 gap-4 md:columns-2">
        {quotes.map((q, i) => (
          <article key={`${q.persona_id}-${i}`} className="mb-4 break-inside-avoid rounded-lg border border-gray-100 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPersonaColor(q.persona_id)}`}>
                {q.segment_label}
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${sentimentClasses[q.sentiment] ?? sentimentClasses.neutral}`}>
                {q.sentiment}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-700">"{q.quote}"</p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-400 capitalize">{q.facet}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
