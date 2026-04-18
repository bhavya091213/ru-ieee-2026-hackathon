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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Feature Scores</h2>
      <p className="mt-1 text-sm text-gray-500">Mean vs minimum across personas</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
            <YAxis dataKey="facet" type="category" stroke="#9ca3af" fontSize={12} width={70} />
            <Tooltip />
            <Bar dataKey="min" name="Min" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
            <Bar dataKey="mean" name="Mean" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
