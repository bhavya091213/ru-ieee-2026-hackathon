import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const phases = [
  { name: "RETRIEVING", desc: "Fetching evidence for each persona", icon: "🔍" },
  { name: "ROUND 1", desc: "Initial persona reactions", icon: "💬" },
  { name: "MODERATING", desc: "AI analyzes disagreement", icon: "🎯" },
  { name: "ROUND 2", desc: "Debate & position updates", icon: "🔄" },
  { name: "ANALYZING", desc: "Synthesis & recommendations", icon: "📊" },
  { name: "SCORING", desc: "Compute alignment metrics", icon: "✅" },
];

export const SimulationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activePhase = Math.min(5, Math.floor(interpolate(frame, [60, 500], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "#0f0f23",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", width: "100%", maxWidth: 1200 }}>
        <h2
          style={{
            fontSize: 56,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 700,
            opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 20,
          }}
        >
          Simulation State Machine
        </h2>

        <p
          style={{
            fontSize: 22,
            color: "#6366f1",
            fontFamily: "system-ui, sans-serif",
            opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 60,
          }}
        >
          7-phase async orchestration with fail-fast semantics
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          {phases.map((phase, i) => {
            const isActive = i === activePhase;
            const isPast = i < activePhase;
            const delay = 60 + i * 15;
            const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  opacity,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 30px",
                  borderRadius: 12,
                  width: 700,
                  background: isActive
                    ? "rgba(99, 102, 241, 0.15)"
                    : isPast
                    ? "rgba(34, 197, 94, 0.08)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: isActive
                    ? "2px solid #6366f1"
                    : isPast
                    ? "1px solid rgba(34, 197, 94, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  transition: "all 0.3s",
                }}
              >
                <span style={{ fontSize: 28 }}>{phase.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: isActive ? "#a5b4fc" : isPast ? "#86efac" : "#64748b",
                      fontFamily: "system-ui, monospace",
                    }}
                  >
                    {phase.name}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: "#94a3b8",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {phase.desc}
                  </div>
                </div>
                {isPast && (
                  <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 22 }}>
                    ✓
                  </span>
                )}
                {isActive && (
                  <span style={{ marginLeft: "auto", color: "#6366f1", fontSize: 16 }}>
                    Running...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
