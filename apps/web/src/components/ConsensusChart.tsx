import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardPayload } from "../lib/types";

interface ConsensusChartProps {
  featureScores: DashboardPayload["feature_scores"];
}

export function ConsensusChart({ featureScores }: ConsensusChartProps) {
  const data = Object.entries(featureScores).map(([facet, row]) => ({
    facet: facet.charAt(0).toUpperCase() + facet.slice(1),
    mean: Number((row.mean * 100).toFixed(0)),
    min: Number((row.min * 100).toFixed(0)),
  }));

  return (
    <div className="card p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Feature Scores</h2>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">Mean vs minimum across personas</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} stroke="var(--color-text-faint)" fontSize={12} />
            <YAxis dataKey="facet" type="category" stroke="var(--color-text-faint)" fontSize={12} width={70} />
            <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-surface-border)", borderRadius: 8, color: "var(--color-text)" }} />
            <Bar dataKey="min" name="Min" fill="var(--color-surface-border)" radius={[0, 4, 4, 0]} />
            <Bar dataKey="mean" name="Mean" fill="var(--color-vgreen)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
