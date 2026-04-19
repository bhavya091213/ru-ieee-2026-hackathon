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
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">TRIBE Signal</h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.5)]">{tribe.scored_text}</p>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl bg-[rgba(0,0,0,0.03)] p-5 text-center">
            <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">{m.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-light text-[rgba(0,0,0,0.85)]">{m.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-2xl bg-[#FFB005]/8 px-4 py-2.5 text-xs text-[#9A6B00]">
        Exploratory heuristic signal. Not a validated product metric.
      </p>
    </div>
  );
}
