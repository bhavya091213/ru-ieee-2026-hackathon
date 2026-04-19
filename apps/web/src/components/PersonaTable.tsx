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
    <div className="card-dia p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Personas</h2>
          <p className="mt-0.5 text-sm text-[rgba(0,0,0,0.45)]">Click a row to expand details and round comparison.</p>
        </div>
        <button type="button" onClick={() => setSortDesc((v) => !v)} className="rounded-full border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs font-medium text-[rgba(0,0,0,0.6)] transition hover:bg-[rgba(0,0,0,0.04)]">
          Sort {sortDesc ? "\u2193" : "\u2191"}
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((p) => {
          const expanded = expandedId === p.persona_id;
          const r1 = round1Responses.find((r) => r.persona_id === p.persona_id);
          const r2 = round2Responses.find((r) => r.persona_id === p.persona_id);

          return (
            <div key={p.persona_id} className={`rounded-2xl border transition ${expanded ? "border-[rgba(0,0,0,0.15)] bg-[rgba(0,0,0,0.02)]" : "border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.12)]"}`}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : p.persona_id)} className="w-full p-4 text-left">
                <div className="grid gap-3 sm:grid-cols-[1.3fr_0.8fr_1fr_1fr]">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getPersonaDot(p.persona_id)}`} />
                    <div>
                      <p className="font-medium text-[rgba(0,0,0,0.85)]">{p.segment_label}</p>
                      <p className="mt-0.5 text-sm text-[rgba(0,0,0,0.45)] line-clamp-1">{p.summary}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.35)]">Adoption</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-[rgba(0,0,0,0.06)]">
                        <div className="h-1.5 rounded-full bg-[rgba(0,0,0,0.6)]" style={{ width: `${p.adoption_likelihood}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-[rgba(0,0,0,0.7)]">{p.adoption_likelihood}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.35)]">Positive</p>
                    <p className="mt-1 text-sm text-[rgba(0,0,0,0.6)]">{p.strongest_positive}</p>
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.35)]">Concern</p>
                    <p className="mt-1 text-sm text-[rgba(0,0,0,0.6)]">{p.strongest_concern}</p>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-[rgba(0,0,0,0.06)] p-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.35)]">Feature Priorities</p>
                      <div className="space-y-2.5">
                        {Object.entries(p.feature_priorities).map(([facet, score]) => (
                          <div key={facet}>
                            <div className="flex justify-between text-sm">
                              <span className="capitalize text-[rgba(0,0,0,0.6)]">{facet}</span>
                              <span className="font-medium text-[rgba(0,0,0,0.8)]">{Math.round(score * 100)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-[rgba(0,0,0,0.06)]">
                              <div className="h-1.5 rounded-full bg-[#FFB005]" style={{ width: `${Math.round(score * 100)}%` }} />
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
