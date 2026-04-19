import { useState } from "react";
import { getPersonaDot } from "../lib/colors";
import type { PersonaResponse, PersonaSummary } from "../lib/types";

interface RoundTimelineProps {
  personas: PersonaSummary[];
  round1Responses: PersonaResponse[];
  round2Responses: PersonaResponse[];
  moderatorQuestion: string;
}

function ResponseCard({
  response,
  persona,
  round,
}: {
  response: PersonaResponse;
  persona: PersonaSummary | undefined;
  round: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = persona?.segment_label ?? response.persona_id;
  const likelihood = response.adoption_likelihood_0_100;
  const tone =
    likelihood >= 60
      ? "border-emerald-200 bg-emerald-50/40"
      : likelihood <= 35
        ? "border-[#FA3D1D]/20 bg-[#FA3D1D]/5"
        : "border-[#FFB005]/20 bg-[#FFB005]/5";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getPersonaDot(response.persona_id)}`}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[rgba(0,0,0,0.85)]">
                {label}
              </p>
              <span className="rounded-full bg-[rgba(0,0,0,0.06)] px-2.5 py-0.5 text-xs font-bold text-[rgba(0,0,0,0.6)]">
                {likelihood}%
              </span>
            </div>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-[rgba(0,0,0,0.55)]">
              {response.overall_reaction.slice(0, expanded ? undefined : 180)}
              {!expanded && response.overall_reaction.length > 180 && "..."}
            </p>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-[rgba(0,0,0,0.06)] pt-3 pl-5">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Strongest Positive
              </p>
              <p className="mt-0.5 text-[rgba(0,0,0,0.6)]">
                {response.strongest_positive}
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[#FA3D1D]">
                Strongest Concern
              </p>
              <p className="mt-0.5 text-[rgba(0,0,0,0.6)]">
                {response.strongest_concern}
              </p>
            </div>
          </div>
          {Object.keys(response.feature_scores).length > 0 && (
            <div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">
                Feature Scores
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {Object.entries(response.feature_scores).map(
                  ([facet, score]) => (
                    <span
                      key={facet}
                      className="rounded-full bg-[rgba(0,0,0,0.05)] px-2.5 py-1 text-xs capitalize text-[rgba(0,0,0,0.6)]"
                    >
                      {facet}: {Math.round(score * 100)}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
          {response.cited_chunk_ids.length > 0 && (
            <p className="text-xs text-[rgba(0,0,0,0.3)]">
              {response.cited_chunk_ids.length} evidence chunk(s) cited
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RoundTimeline({
  personas,
  round1Responses,
  round2Responses,
  moderatorQuestion,
}: RoundTimelineProps) {
  const personaMap = new Map(personas.map((p) => [p.persona_id, p]));
  const alsoByLabel = new Map(personas.map((p) => [p.segment_label, p]));

  const findPersona = (pid: string) =>
    personaMap.get(pid) ?? alsoByLabel.get(pid);

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
        Discussion Timeline
      </h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">
        Full conversation across both rounds
      </p>

      <div className="relative mt-6 ml-4 border-l-2 border-[rgba(0,0,0,0.06)] pl-6">
        {/* Round 1 */}
        <div className="relative pb-6">
          <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-[#0358F7] text-[10px] font-bold text-white">
            1
          </div>
          <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#0358F7]">
            Round 1 — Initial Reactions
          </h3>
          <div className="mt-3 space-y-3">
            {round1Responses.map((r) => (
              <ResponseCard
                key={`r1-${r.persona_id}`}
                response={r}
                persona={findPersona(r.persona_id)}
                round={1}
              />
            ))}
          </div>
        </div>

        {/* Moderator */}
        {moderatorQuestion && (
          <div className="relative pb-6">
            <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-[#FFB005] text-[10px] font-bold text-white">
              M
            </div>
            <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#FFB005]">
              Moderator Intervention
            </h3>
            <div className="mt-3 rounded-2xl border border-[#FFB005]/20 bg-[#FFB005]/5 p-4">
              <p className="font-[family-name:var(--font-display)] text-[0.9375rem] italic leading-relaxed text-[rgba(0,0,0,0.7)]">
                &ldquo;{moderatorQuestion}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Round 2 */}
        <div className="relative">
          <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-[#C679C4] text-[10px] font-bold text-white">
            2
          </div>
          <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#C679C4]">
            Round 2 — After Discussion
          </h3>
          <div className="mt-3 space-y-3">
            {round2Responses.map((r) => (
              <ResponseCard
                key={`r2-${r.persona_id}`}
                response={r}
                persona={findPersona(r.persona_id)}
                round={2}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
