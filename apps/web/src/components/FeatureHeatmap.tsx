import type { DashboardPayload, PersonaSummary } from "../lib/types";

interface FeatureHeatmapProps {
  featureScores: DashboardPayload["feature_scores"];
  personas: PersonaSummary[];
}

function scoreColor(score: number) {
  if (score >= 0.75) return "bg-emerald-50 text-emerald-800";
  if (score >= 0.5) return "bg-[#FFB005]/10 text-[#9A6B00]";
  return "bg-[#FA3D1D]/10 text-[#D42E11]";
}

export function FeatureHeatmap({ featureScores, personas }: FeatureHeatmapProps) {
  const facets = Object.keys(featureScores);

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Feature Heatmap</h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">Per-persona scores by facet</p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.06)]">
              <th className="pb-3 pr-4 text-left font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">Persona</th>
              {facets.map((f) => (
                <th key={f} className="pb-3 text-center font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)] capitalize">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.persona_id} className="border-b border-[rgba(0,0,0,0.04)]">
                <td className="py-3 pr-4 font-medium text-[rgba(0,0,0,0.8)]">{p.segment_label}</td>
                {facets.map((f) => {
                  const score = featureScores[f]?.persona_scores[p.persona_id] ?? 0;
                  return (
                    <td key={`${p.persona_id}-${f}`} className="py-3 text-center">
                      <span className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold ${scoreColor(score)}`}>
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
