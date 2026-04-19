import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PersonaResponse, PersonaSummary } from "../lib/types";

interface AdoptionShiftProps {
  personas: PersonaSummary[];
  round1Responses: PersonaResponse[];
  round2Responses: PersonaResponse[];
}

export function AdoptionShift({
  personas,
  round1Responses,
  round2Responses,
}: AdoptionShiftProps) {
  const data = personas.map((p) => {
    const r1 =
      round1Responses.find(
        (r) => r.persona_id === p.persona_id || r.persona_id === p.segment_label,
      )?.adoption_likelihood_0_100 ?? 0;
    const r2 =
      round2Responses.find(
        (r) => r.persona_id === p.persona_id || r.persona_id === p.segment_label,
      )?.adoption_likelihood_0_100 ?? 0;
    return {
      name: p.segment_label.length > 20 ? `${p.segment_label.slice(0, 18)}...` : p.segment_label,
      r1,
      r2,
      delta: r2 - r1,
    };
  });

  return (
    <div className="card-dia p-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
        Adoption Shift
      </h2>
      <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">
        How opinions changed between rounds
      </p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.06)"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="rgba(0,0,0,0.3)"
              fontSize={12}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="rgba(0,0,0,0.3)"
              fontSize={11}
              width={100}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "16px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "r1" ? "Round 1" : "Round 2",
              ]}
            />
            <Bar dataKey="r1" name="r1" fill="rgba(0,0,0,0.15)" radius={[0, 6, 6, 0]} barSize={12} />
            <Bar dataKey="r2" name="r2" radius={[0, 6, 6, 0]} barSize={12}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.delta > 5
                      ? "#10b981"
                      : entry.delta < -5
                        ? "#FA3D1D"
                        : "rgba(0,0,0,0.6)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center gap-6 text-xs text-[rgba(0,0,0,0.4)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[rgba(0,0,0,0.15)]" />
          Round 1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[rgba(0,0,0,0.6)]" />
          Round 2
        </span>
      </div>
    </div>
  );
}
