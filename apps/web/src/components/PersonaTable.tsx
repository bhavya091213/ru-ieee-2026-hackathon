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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Personas</h2>
          <p className="mt-0.5 text-sm text-gray-500">Click a row to expand details and round comparison.</p>
        </div>
        <button type="button" onClick={() => setSortDesc((v) => !v)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
          Sort {sortDesc ? "\u2193" : "\u2191"}
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((p) => {
          const expanded = expandedId === p.persona_id;
          const r1 = round1Responses.find((r) => r.persona_id === p.persona_id);
          const r2 = round2Responses.find((r) => r.persona_id === p.persona_id);

          return (
            <div key={p.persona_id} className={`rounded-lg border transition ${expanded ? "border-blue-200 bg-blue-50/30" : "border-gray-100 hover:border-gray-200"}`}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : p.persona_id)} className="w-full p-4 text-left">
                <div className="grid gap-3 sm:grid-cols-[1.3fr_0.8fr_1fr_1fr]">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getPersonaDot(p.persona_id)}`} />
                    <div>
                      <p className="font-medium text-gray-900">{p.segment_label}</p>
                      <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{p.summary}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Adoption</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${p.adoption_likelihood}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{p.adoption_likelihood}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Positive</p>
                    <p className="mt-1 text-sm text-gray-700">{p.strongest_positive}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Concern</p>
                    <p className="mt-1 text-sm text-gray-700">{p.strongest_concern}</p>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-gray-100 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Feature Priorities</p>
                      <div className="space-y-2">
                        {Object.entries(p.feature_priorities).map(([facet, score]) => (
                          <div key={facet}>
                            <div className="flex justify-between text-sm">
                              <span className="capitalize text-gray-600">{facet}</span>
                              <span className="font-medium text-gray-800">{Math.round(score * 100)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                              <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.round(score * 100)}%` }} />
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
