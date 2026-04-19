import type { DashboardPayload, PersonaSummary } from "../lib/types";

interface FeatureHeatmapProps {
  featureScores: DashboardPayload["feature_scores"];
  personas: PersonaSummary[];
}

/** Normalize a key for fuzzy matching: lowercase, strip spaces/hyphens/underscores */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s\-_]/g, "").trim();
}

/**
 * Look up a persona's score from persona_scores using fuzzy key matching.
 * Tries exact match first, then falls back to normalized comparison.
 */
function findPersonaScore(
  personaScores: Record<string, number>,
  persona: PersonaSummary
): number | null {
  // 1. Try exact key matches first
  if (persona.persona_id in personaScores) return personaScores[persona.persona_id];
  if (persona.segment_label in personaScores) return personaScores[persona.segment_label];

  // 2. Fuzzy match: normalize both sides and compare
  const normalizedId = normalizeKey(persona.persona_id);
  const normalizedLabel = normalizeKey(persona.segment_label);

  for (const [key, value] of Object.entries(personaScores)) {
    const normalizedKey = normalizeKey(key);
    if (normalizedKey === normalizedId || normalizedKey === normalizedLabel) {
      return value;
    }
  }

  return null;
}

/**
 * Interpolate a score (0..1) into a heatmap color:
 *   0.0 = red (220, 53, 47)
 *   0.5 = yellow (234, 179, 8)
 *   1.0 = green (34, 163, 74)
 */
function heatmapStyle(score: number): React.CSSProperties {
  const clamped = Math.max(0, Math.min(1, score));

  let r: number, g: number, b: number;

  if (clamped < 0.5) {
    const t = clamped / 0.5;
    r = Math.round(220 + (234 - 220) * t);
    g = Math.round(53 + (179 - 53) * t);
    b = Math.round(47 + (8 - 47) * t);
  } else {
    const t = (clamped - 0.5) / 0.5;
    r = Math.round(234 + (34 - 234) * t);
    g = Math.round(179 + (163 - 179) * t);
    b = Math.round(8 + (74 - 8) * t);
  }

  const textColor = clamped > 0.35 && clamped < 0.65 ? "rgba(0,0,0,0.85)" : "#fff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
}

export function FeatureHeatmap({ featureScores, personas }: FeatureHeatmapProps) {
  const facets = Object.keys(featureScores);

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Feature Heatmap</h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">Per-persona scores by facet</p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(0,0,0,0.06)]">
              <th className="pb-3 pr-4 text-left font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">Persona</th>
              {facets.map((f) => (
                <th key={f} className="pb-3 px-1 text-center font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)] capitalize">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.persona_id} className="border-b border-[rgba(0,0,0,0.04)]">
                <td className="py-3 pr-4 font-medium text-[rgba(0,0,0,0.8)]">{p.segment_label}</td>
                {facets.map((f) => {
                  const ps = featureScores[f]?.persona_scores ?? {};
                  const score = findPersonaScore(ps, p);
                  const hasScore = score !== null;
                  const displayScore = score ?? 0;
                  return (
                    <td key={`${p.persona_id}-${f}`} className="p-1 text-center">
                      <div
                        className="mx-auto flex h-10 w-full min-w-[3rem] items-center justify-center rounded-md text-xs font-semibold"
                        style={hasScore ? heatmapStyle(displayScore) : { backgroundColor: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.3)" }}
                      >
                        {hasScore ? Math.round(displayScore * 100) : "—"}
                      </div>
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
