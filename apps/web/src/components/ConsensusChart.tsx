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

  if (data.length === 0) {
    return (
      <div className="card-dia p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Feature Scores</h2>
        <p className="mt-4 text-center text-sm text-[rgba(0,0,0,0.35)]">No feature score data available.</p>
      </div>
    );
  }

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Feature Scores</h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">Mean vs minimum across personas</p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} stroke="#999" fontSize={12} />
            <YAxis dataKey="facet" type="category" stroke="#999" fontSize={12} width={70} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            />
            <Bar dataKey="min" name="Min" fill="#d4d4d4" radius={[0, 8, 8, 0]} />
            <Bar dataKey="mean" name="Mean" fill="#333333" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
