import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { DashboardPayload } from "../lib/types";

interface DisagreementRadarProps {
  featureScores: DashboardPayload["feature_scores"];
}

export function DisagreementRadar({ featureScores }: DisagreementRadarProps) {
  const data = Object.entries(featureScores).map(([facet, row]) => ({
    facet: facet.charAt(0).toUpperCase() + facet.slice(1),
    disagreement: Number((row.std * 100).toFixed(0)),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Disagreement Radar</h2>
      <p className="mt-1 text-sm text-gray-500">Feature-level variance across personas</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="facet" tick={{ fill: "#6b7280", fontSize: 12 }} />
            <Radar dataKey="disagreement" fill="#f59e0b" fillOpacity={0.25} stroke="#f59e0b" strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
