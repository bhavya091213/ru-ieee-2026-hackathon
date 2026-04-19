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
    <div className="card p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Disagreement Radar</h2>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">Feature-level variance across personas</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="var(--color-surface-border)" />
            <PolarAngleAxis dataKey="facet" tick={{ fill: "var(--color-text-dim)", fontSize: 12 }} />
            <Radar dataKey="disagreement" fill="var(--color-vyellow)" fillOpacity={0.25} stroke="var(--color-vyellow)" strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
