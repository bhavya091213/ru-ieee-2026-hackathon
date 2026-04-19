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
    <div className="card p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">TRIBE Signal</h2>
      <p className="mt-1 text-sm text-[var(--color-text-dim)]">{tribe.scored_text}</p>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="border border-[var(--color-surface-border)] bg-[var(--color-bg-deep)] p-4 text-center rounded-lg">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-faint)]">{m.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-vcyan)]">{m.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 border border-[var(--color-vyellow)]/20 bg-[var(--color-vyellow)]/5 px-3 py-2 text-xs text-[var(--color-vyellow)]">
        Exploratory heuristic signal. Not a validated product metric.
      </p>
    </div>
  );
}
