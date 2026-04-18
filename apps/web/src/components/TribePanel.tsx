import { Line, LineChart, ResponsiveContainer } from "recharts";

import type { TribeResult } from "../lib/types";

interface TribePanelProps {
  tribe: TribeResult | null;
}

export function TribePanel({ tribe }: TribePanelProps) {
  if (!tribe || !tribe.enabled) {
    return null;
  }

  const sparkline = Array.from({ length: 6 }, (_, index) => ({
    value: Number(
      Math.max(
        0,
        Math.min(1, tribe.response_strength - 0.1 + index * 0.035),
      ).toFixed(2),
    ),
  }));

  const metrics = [
    ["Strength", tribe.response_strength],
    ["Variance", tribe.response_variance],
    ["Spread", tribe.response_spread],
  ];

  return (
    <section className="animate-fade-in rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-white">TRIBE Signal</h2>
          <p className="mt-2 text-sm text-slate-400">{tribe.scored_text}</p>
        </div>
        <div className="h-12 w-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line
                dataKey="value"
                dot={false}
                stroke="#60a5fa"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/8 bg-slate-950/70 p-4"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              {label}
            </p>
            <p className="mt-3 font-display text-2xl text-white">
              {Number(value).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm italic text-amber-300">
        Exploratory cortical-response signal. Not a validated product metric.
      </p>
    </section>
  );
}
