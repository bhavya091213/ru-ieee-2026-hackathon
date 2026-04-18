import type { DashboardPayload, PersonaSummary } from "../lib/types";

interface FeatureHeatmapProps {
  featureScores: DashboardPayload["feature_scores"];
  personas: PersonaSummary[];
}

function scoreToTone(score: number) {
  if (score >= 0.75) {
    return "bg-emerald-400/40 text-emerald-50";
  }
  if (score >= 0.5) {
    return "bg-amber-300/35 text-amber-50";
  }
  return "bg-rose-400/35 text-rose-50";
}

export function FeatureHeatmap({ featureScores, personas }: FeatureHeatmapProps) {
  const facets = Object.keys(featureScores);

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <h2 className="font-display text-xl text-white">Feature Heatmap</h2>
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[640px] space-y-3">
          <div className="grid grid-cols-[1.4fr_repeat(6,minmax(0,1fr))] gap-3 text-xs uppercase tracking-[0.22em] text-slate-500">
            <div>Persona</div>
            {facets.map((facet) => (
              <div key={facet} className="text-center capitalize">
                {facet}
              </div>
            ))}
          </div>

          {personas.map((persona) => (
            <div
              key={persona.persona_id}
              className="grid grid-cols-[1.4fr_repeat(6,minmax(0,1fr))] gap-3"
            >
              <div className="rounded-xl bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
                {persona.segment_label}
              </div>
              {facets.map((facet) => {
                const score = featureScores[facet]?.persona_scores[persona.persona_id] ?? 0;

                return (
                  <div
                    key={`${persona.persona_id}-${facet}`}
                    className={`rounded-xl px-3 py-3 text-center text-sm font-medium ${scoreToTone(
                      score,
                    )}`}
                  >
                    {Math.round(score * 100)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
