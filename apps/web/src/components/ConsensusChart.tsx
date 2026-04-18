import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardPayload } from "../lib/types";

interface ConsensusChartProps {
  featureScores: DashboardPayload["feature_scores"];
}

export function ConsensusChart({ featureScores }: ConsensusChartProps) {
  const data = Object.entries(featureScores).map(([facet, row]) => ({
    facet,
    mean: Number((row.mean * 100).toFixed(0)),
    floor: Number((row.min * 100).toFixed(0)),
  }));

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <h2 className="font-display text-xl text-white">Consensus by Feature</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid stroke="rgba(148,163,184,0.14)" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="facet" type="category" stroke="#94a3b8" />
            <Tooltip />
            <Bar dataKey="floor" fill="#334155" radius={[10, 10, 10, 10]} />
            <Bar dataKey="mean" fill="#22d3ee" radius={[10, 10, 10, 10]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
