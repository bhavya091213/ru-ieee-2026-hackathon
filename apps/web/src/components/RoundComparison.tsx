import type { PersonaResponse } from "../lib/types";

interface RoundComparisonProps {
  round1?: PersonaResponse;
  round2?: PersonaResponse;
}

export function RoundComparison({ round1, round2 }: RoundComparisonProps) {
  if (!round1 || !round2) {
    return (
      <div className="border border-[var(--color-surface-border)] bg-[var(--color-bg-deep)] p-4 text-sm text-[var(--color-text-faint)] rounded-lg">
        No round comparison available.
      </div>
    );
  }

  const delta = round2.adoption_likelihood_0_100 - round1.adoption_likelihood_0_100;
  const deltaColor = delta > 0 ? "text-[var(--color-vgreen)]" : delta < 0 ? "text-[var(--color-vred)]" : "text-[var(--color-text-dim)]";

  return (
    <div className="border border-[var(--color-surface-border)] bg-[var(--color-bg-deep)] p-4 rounded-lg">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">Round Comparison</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-text-dim)]">R1: {round1.adoption_likelihood_0_100}%</span>
        <span className="text-[var(--color-text-dim)]">R2: {round2.adoption_likelihood_0_100}%</span>
      </div>
      <p className={`mt-2 text-sm font-bold ${deltaColor}`}>
        {delta > 0 ? "+" : ""}{delta} points
      </p>
    </div>
  );
}
