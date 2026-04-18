import { useMemo, useState } from "react";

import { getPersonaColor } from "../lib/colors";
import type { PersonaResponse, PersonaSummary } from "../lib/types";
import { RoundComparison } from "./RoundComparison";

interface PersonaTableProps {
  personas: PersonaSummary[];
  round1Responses: PersonaResponse[];
  round2Responses: PersonaResponse[];
}

export function PersonaTable({
  personas,
  round1Responses,
  round2Responses,
}: PersonaTableProps) {
  const [sortDescending, setSortDescending] = useState(true);
  const [expandedPersonaId, setExpandedPersonaId] = useState<string | null>(null);

  const sortedPersonas = useMemo(() => {
    return [...personas].sort((left, right) =>
      sortDescending
        ? right.adoption_likelihood - left.adoption_likelihood
        : left.adoption_likelihood - right.adoption_likelihood,
    );
  }, [personas, sortDescending]);

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-white">Persona Table</h2>
          <p className="mt-1 text-sm text-slate-400">
            Sort by adoption, then open a row to compare round shifts.
          </p>
        </div>
        <button
          className="rounded-full border border-white/8 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/6"
          onClick={() => setSortDescending((current) => !current)}
          type="button"
        >
          Sort {sortDescending ? "desc" : "asc"}
        </button>
      </div>

      <div className="space-y-3">
        {sortedPersonas.map((persona) => {
          const round1 = round1Responses.find(
            (response) => response.persona_id === persona.persona_id,
          );
          const round2 = round2Responses.find(
            (response) => response.persona_id === persona.persona_id,
          );
          const expanded = expandedPersonaId === persona.persona_id;

          return (
            <div
              key={persona.persona_id}
              className="rounded-2xl border border-white/8 bg-slate-950/70 p-4 transition-shadow hover:shadow-xl"
            >
              <button
                className="grid w-full gap-4 text-left md:grid-cols-[1.2fr_0.9fr_1fr_1fr]"
                onClick={() =>
                  setExpandedPersonaId((current) =>
                    current === persona.persona_id ? null : persona.persona_id,
                  )
                }
                type="button"
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-1 inline-flex h-3 w-3 shrink-0 rounded-full ${getPersonaColor(
                      persona.persona_id,
                    )
                      .split(" ")
                      .at(0)}`}
                  />
                  <div>
                    <p className="font-medium text-white">{persona.segment_label}</p>
                    <p className="mt-1 text-sm text-slate-400">{persona.summary}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Adoption
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-cyan-400"
                      style={{ width: `${persona.adoption_likelihood}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    {persona.adoption_likelihood}%
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Top positive
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {persona.strongest_positive}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Top concern
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {persona.strongest_concern}
                  </p>
                </div>
              </button>

              {expanded ? (
                <div className="mt-5 grid gap-4 border-t border-white/8 pt-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/8 bg-slate-900/60 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      Feature priorities
                    </p>
                    <div className="mt-3 space-y-3">
                      {Object.entries(persona.feature_priorities).map(([facet, score]) => (
                        <div key={facet}>
                          <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                            <span className="capitalize">{facet}</span>
                            <span>{Math.round(score * 100)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-amber-300"
                              style={{ width: `${Math.round(score * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <RoundComparison round1={round1} round2={round2} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
