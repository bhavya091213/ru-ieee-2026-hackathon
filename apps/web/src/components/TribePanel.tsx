import type { TribeResult } from "../lib/types";

interface TribePanelProps {
  tribe: TribeResult | null;
}

export function TribePanel({ tribe }: TribePanelProps) {
  if (!tribe || !tribe.enabled) return null;

  const metrics = [
    { label: "Strength", value: tribe.response_strength },
    { label: "Variance", value: tribe.response_variance },
    { label: "Spread", value: tribe.response_spread },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">TRIBE Signal</h2>
      <p className="mt-1 text-sm text-gray-600">{tribe.scored_text}</p>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{m.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Exploratory heuristic signal. Not a validated product metric.
      </p>
    </div>
  );
}
