import type { PersonaResponse } from "../lib/types";

interface RoundComparisonProps {
  round1?: PersonaResponse;
  round2?: PersonaResponse;
}

export function RoundComparison({ round1, round2 }: RoundComparisonProps) {
  if (!round1 || !round2) {
    return (
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[rgba(0,0,0,0.02)] p-4 text-sm text-[rgba(0,0,0,0.4)]">
        No round comparison available.
      </div>
    );
  }

  const delta = round2.adoption_likelihood_0_100 - round1.adoption_likelihood_0_100;
  const deltaTone = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-[#FA3D1D]" : "text-[rgba(0,0,0,0.45)]";

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] p-4">
      <p className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.35)]">Round Comparison</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[rgba(0,0,0,0.6)]">R1: {round1.adoption_likelihood_0_100}%</span>
        <span className="text-[rgba(0,0,0,0.6)]">R2: {round2.adoption_likelihood_0_100}%</span>
      </div>
      <p className={`mt-2 font-[family-name:var(--font-display)] text-lg font-light ${deltaTone}`}>
        {delta > 0 ? "+" : ""}{delta} points
      </p>
    </div>
  );
}
