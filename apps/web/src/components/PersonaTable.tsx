import { useMemo, useState } from "react";
import { getPersonaDot } from "../lib/colors";
import type { PersonaResponse, PersonaSummary } from "../lib/types";
import { RoundComparison } from "./RoundComparison";

interface PersonaTableProps {
  personas: PersonaSummary[];
  round1Responses: PersonaResponse[];
  round2Responses: PersonaResponse[];
}

export function PersonaTable({ personas, round1Responses, round2Responses }: PersonaTableProps) {
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...personas].sort((a, b) => sortDesc ? b.adoption_likelihood - a.adoption_likelihood : a.adoption_likelihood - b.adoption_likelihood),
    [personas, sortDesc],
  );

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Personas</h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">Click a row to expand details.</p>
        </div>
        <button type="button" onClick={() => setSortDesc((v) => !v)} className="btn-secondary text-xs">
          Sort {sortDesc ? "\u2193" : "\u2191"}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((p) => {
          const expanded = expandedId === p.persona_id;
          const r1 = round1Responses.find((r) => r.persona_id === p.persona_id);
          const r2 = round2Responses.find((r) => r.persona_id === p.persona_id);

          return (
            <div key={p.persona_id} className={`border transition ${expanded ? "border-[var(--color-vgreen)]/30 bg-[var(--color-vgreen)]/5" : "border-[var(--color-surface-border)] hover:border-[var(--color-vgreen)]/20"} rounded-lg`}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : p.persona_id)} className="w-full p-4 text-left">
                <div className="grid gap-3 sm:grid-cols-[1.3fr_0.8fr_1fr_1fr]">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getPersonaDot(p.persona_id)}`} />
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{p.segment_label}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-dim)] line-clamp-1">{p.summary}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Adoption</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-[var(--color-bg-deep)]">
                        <div className="h-1.5 rounded-full bg-[var(--color-vgreen)]" style={{ width: `${p.adoption_likelihood}%` }} />
                      </div>
                      <span className="text-sm font-bold text-[var(--color-vgreen)]">{p.adoption_likelihood}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Positive</p>
                    <p className="mt-1 text-sm text-[var(--color-text-dim)]">{p.strongest_positive}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Concern</p>
                    <p className="mt-1 text-sm text-[var(--color-text-dim)]">{p.strongest_concern}</p>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-[var(--color-surface-border)] p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Feature Priorities</p>
                      <div className="space-y-2">
                        {Object.entries(p.feature_priorities).map(([facet, score]) => (
                          <div key={facet}>
                            <div className="flex justify-between text-sm">
                              <span className="capitalize text-[var(--color-text-dim)]">{facet}</span>
                              <span className="font-bold text-[var(--color-vyellow)]">{Math.round(score * 100)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-[var(--color-bg-deep)]">
                              <div className="h-1.5 rounded-full bg-[var(--color-vyellow)]" style={{ width: `${Math.round(score * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <RoundComparison round1={r1} round2={r2} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
