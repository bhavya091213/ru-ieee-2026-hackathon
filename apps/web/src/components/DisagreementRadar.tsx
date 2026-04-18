import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { DashboardPayload } from "../lib/types";

interface DisagreementRadarProps {
  featureScores: DashboardPayload["feature_scores"];
}

export function DisagreementRadar({ featureScores }: DisagreementRadarProps) {
  const data = Object.entries(featureScores).map(([facet, row]) => ({
    facet,
    disagreement: Number((row.std * 100).toFixed(0)),
  }));

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <h2 className="font-display text-xl text-white">Disagreement Radar</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(148,163,184,0.18)" />
            <PolarAngleAxis dataKey="facet" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
            <Radar
              dataKey="disagreement"
              fill="#f59e0b"
              fillOpacity={0.35}
              stroke="#fbbf24"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
