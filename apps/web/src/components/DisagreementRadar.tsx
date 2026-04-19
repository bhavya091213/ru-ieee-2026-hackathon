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

  if (data.length === 0) {
    return (
      <div className="card-dia p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Disagreement Radar</h2>
        <p className="mt-4 text-center text-sm text-[rgba(0,0,0,0.35)]">No disagreement data available.</p>
      </div>
    );
  }

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Disagreement Radar</h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">Feature-level variance across personas</p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e5e5" />
            <PolarAngleAxis dataKey="facet" tick={{ fill: '#777', fontSize: 12 }} />
            <Radar dataKey="disagreement" fill="#FFB005" fillOpacity={0.2} stroke="#FFB005" strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
