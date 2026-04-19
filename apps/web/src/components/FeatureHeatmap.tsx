import type { DashboardPayload, PersonaSummary } from "../lib/types";

interface FeatureHeatmapProps {
  featureScores: DashboardPayload["feature_scores"];
  personas: PersonaSummary[];
}

function scoreColor(score: number) {
  if (score >= 0.75) return "bg-[var(--color-vgreen)]/20 text-[var(--color-vgreen)]";
  if (score >= 0.5) return "bg-[var(--color-vyellow)]/20 text-[var(--color-vyellow)]";
  return "bg-[var(--color-vred)]/20 text-[var(--color-vred)]";
}

export function FeatureHeatmap({ featureScores, personas }: FeatureHeatmapProps) {
  const facets = Object.keys(featureScores);

  return (
    <div className="card p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Feature Heatmap</h2>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">Per-persona scores by facet</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-surface-border)]">
              <th className="pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Persona</th>
              {facets.map((f) => (
                <th key={f} className="pb-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)] capitalize">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.persona_id} className="border-b border-[var(--color-surface-border)]/50">
                <td className="py-2.5 pr-4 font-medium text-[var(--color-text)]">{p.segment_label}</td>
                {facets.map((f) => {
                  const score = featureScores[f]?.persona_scores[p.persona_id] ?? 0;
                  return (
                    <td key={`${p.persona_id}-${f}`} className="py-2.5 text-center">
                      <span className={`inline-block px-2.5 py-1 text-xs font-bold ${scoreColor(score)}`}>
                        {Math.round(score * 100)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
