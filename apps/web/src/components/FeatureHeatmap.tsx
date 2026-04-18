import type { DashboardPayload, PersonaSummary } from "../lib/types";

interface FeatureHeatmapProps {
  featureScores: DashboardPayload["feature_scores"];
  personas: PersonaSummary[];
}

function scoreColor(score: number) {
  if (score >= 0.75) return "bg-green-100 text-green-800";
  if (score >= 0.5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function FeatureHeatmap({ featureScores, personas }: FeatureHeatmapProps) {
  const facets = Object.keys(featureScores);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Feature Heatmap</h2>
      <p className="mt-1 text-sm text-gray-500">Per-persona scores by facet</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Persona</th>
              {facets.map((f) => (
                <th key={f} className="pb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 capitalize">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.persona_id} className="border-b border-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-800">{p.segment_label}</td>
                {facets.map((f) => {
                  const score = featureScores[f]?.persona_scores[p.persona_id] ?? 0;
                  return (
                    <td key={`${p.persona_id}-${f}`} className="py-2.5 text-center">
                      <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${scoreColor(score)}`}>
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
