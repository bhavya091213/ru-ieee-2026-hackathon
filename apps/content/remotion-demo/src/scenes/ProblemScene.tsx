import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const problems = [
  { icon: "💰", text: "$15,000+", sub: "Average focus group cost" },
  { icon: "⏰", text: "4-6 weeks", sub: "Lead time for results" },
  { icon: "🎯", text: "8 people", sub: "Limited sample size" },
  { icon: "📉", text: "Recruiting bias", sub: "Uncontrollable selection" },
];

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "#0f0f23",
        padding: 100,
      }}
    >
      <div style={{ textAlign: "center", width: "100%" }}>
        <h2
          style={{
            fontSize: 64,
            color: "#ef4444",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 700,
            opacity: headerOpacity,
            marginBottom: 60,
          }}
        >
          The Problem with Market Research
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 50,
            flexWrap: "wrap",
          }}
        >
          {problems.map((problem, i) => {
            const delay = 60 + i * 40;
            const scale = spring({ frame: frame - delay, fps, config: { damping: 10 } });
            const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div
                key={i}
                style={{
                  transform: `scale(${Math.max(0, scale)})`,
                  opacity: Math.max(0, opacity),
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 20,
                  padding: "40px 50px",
                  textAlign: "center",
                  minWidth: 280,
                }}
              >
                <div style={{ fontSize: 48 }}>{problem.icon}</div>
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: "white",
                    fontFamily: "system-ui, sans-serif",
                    marginTop: 15,
                  }}
                >
                  {problem.text}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    color: "#94a3b8",
                    fontFamily: "system-ui, sans-serif",
                    marginTop: 8,
                  }}
                >
                  {problem.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
