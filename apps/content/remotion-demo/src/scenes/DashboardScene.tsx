import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const kpis = [
  { label: "Consensus", value: "73%", color: "#22c55e" },
  { label: "Disagreement", value: "41%", color: "#f59e0b" },
  { label: "Evidence Coverage", value: "88%", color: "#3b82f6" },
];

const features = [
  { facet: "Camera", scores: [0.85, 0.6, 0.4, 0.9] },
  { facet: "Battery", scores: [0.7, 0.8, 0.9, 0.65] },
  { facet: "Price", scores: [0.3, 0.5, 0.95, 0.4] },
  { facet: "Privacy", scores: [0.4, 0.95, 0.6, 0.7] },
  { facet: "Design", scores: [0.9, 0.5, 0.3, 0.8] },
];

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        background: "#0f0f23",
        padding: "60px 80px",
      }}
    >
      <h2
        style={{
          fontSize: 48,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
          marginBottom: 40,
        }}
      >
        Analytics Dashboard
      </h2>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 40, marginBottom: 50 }}>
        {kpis.map((kpi, i) => {
          const delay = 30 + i * 30;
          const scale = spring({ frame: frame - delay, fps, config: { damping: 10 } });
          return (
            <div
              key={i}
              style={{
                transform: `scale(${Math.max(0, scale)})`,
                background: `${kpi.color}10`,
                border: `1px solid ${kpi.color}40`,
                borderRadius: 16,
                padding: "25px 50px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 800, color: kpi.color, fontFamily: "system-ui, sans-serif" }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 18, color: "#94a3b8", fontFamily: "system-ui, sans-serif", marginTop: 5 }}>
                {kpi.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Heatmap */}
      <div
        style={{
          opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp" }),
          width: "100%",
          maxWidth: 1000,
        }}
      >
        <h3 style={{ fontSize: 24, color: "#a5b4fc", fontFamily: "system-ui, sans-serif", marginBottom: 20 }}>
          Feature Heatmap (Persona x Facet)
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {features.map((feature, i) => {
            const rowDelay = 150 + i * 20;
            const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: rowOpacity }}>
                <span style={{ width: 100, fontSize: 16, color: "#94a3b8", fontFamily: "system-ui, sans-serif", textAlign: "right" }}>
                  {feature.facet}
                </span>
                {feature.scores.map((score, j) => {
                  const r = Math.round(255 * (1 - score));
                  const g = Math.round(255 * score);
                  return (
                    <div
                      key={j}
                      style={{
                        width: 180,
                        height: 40,
                        borderRadius: 6,
                        background: `rgba(${r}, ${g}, 50, 0.3)`,
                        border: `1px solid rgba(${r}, ${g}, 50, 0.5)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        color: "white",
                        fontFamily: "system-ui, monospace",
                      }}
                    >
                      {(score * 10).toFixed(1)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
