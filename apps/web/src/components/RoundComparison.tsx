import type { PersonaResponse } from "../lib/types";

interface RoundComparisonProps {
  round1?: PersonaResponse;
  round2?: PersonaResponse;
}

export function RoundComparison({ round1, round2 }: RoundComparisonProps) {
  if (!round1 || !round2) {
    return (
      <div className="rounded-xl border border-white/8 bg-slate-900/60 p-4 text-sm text-slate-300">
        No round comparison available.
      </div>
    );
  }

  const delta =
    round2.adoption_likelihood_0_100 - round1.adoption_likelihood_0_100;
  const deltaTone =
    delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-slate-300";

  return (
    <div className="rounded-xl border border-white/8 bg-slate-900/60 p-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <span>Round 1: {round1.adoption_likelihood_0_100}%</span>
        <span>Round 2: {round2.adoption_likelihood_0_100}%</span>
      </div>
      <p className={`mt-3 font-medium ${deltaTone}`}>
        Shift: {delta > 0 ? "+" : ""}
        {delta} points
      </p>
    </div>
  );
}
