import type { PersonaResponse } from "../lib/types";

interface RoundComparisonProps {
  round1?: PersonaResponse;
  round2?: PersonaResponse;
}

export function RoundComparison({ round1, round2 }: RoundComparisonProps) {
  if (!round1 || !round2) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-400">
        No round comparison available.
      </div>
    );
  }

  const delta = round2.adoption_likelihood_0_100 - round1.adoption_likelihood_0_100;
  const deltaTone = delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-500";

  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Round Comparison</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">R1: {round1.adoption_likelihood_0_100}%</span>
        <span className="text-gray-600">R2: {round2.adoption_likelihood_0_100}%</span>
      </div>
      <p className={`mt-2 text-sm font-semibold ${deltaTone}`}>
        {delta > 0 ? "+" : ""}{delta} points
      </p>
    </div>
  );
}
