import { getPersonaColor, sentimentClasses } from "../lib/colors";
import type { QuoteCard } from "../lib/types";

interface QuoteWallProps {
  quotes: QuoteCard[];
}

export function QuoteWall({ quotes }: QuoteWallProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <div className="mb-5">
        <h2 className="font-display text-xl text-white">Quote Wall</h2>
        <p className="mt-1 text-sm text-slate-400">
          Quick scan of what sounds memorable, credible, or risky.
        </p>
      </div>

      <div className="columns-1 gap-4 md:columns-2">
        {quotes.map((quote, index) => (
          <article
            key={`${quote.persona_id}-${quote.facet}-${index}`}
            className="mb-4 break-inside-avoid rounded-2xl border border-white/8 bg-slate-950/70 p-5 shadow-lg transition-shadow hover:shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPersonaColor(
                  quote.persona_id,
                )}`}
              >
                {quote.segment_label}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${sentimentClasses[quote.sentiment] ?? sentimentClasses.neutral}`}
              >
                {quote.sentiment}
              </span>
            </div>
            <p className="text-base leading-7 text-slate-100">"{quote.quote}"</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
              {quote.facet}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
