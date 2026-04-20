import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const features = [
  "Real consumer data from Reddit, YouTube, reviews",
  "AI-clustered personas from evidence",
  "Moderated two-round panel discussion",
  "Evidence-backed insights in 60 seconds",
];

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerScale = spring({ frame, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(180deg, #0f0f23 0%, #0a1628 100%)",
        padding: 100,
      }}
    >
      <div style={{ textAlign: "center", width: "100%", maxWidth: 1400 }}>
        <h2
          style={{
            fontSize: 64,
            color: "#22c55e",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 700,
            transform: `scale(${headerScale})`,
            marginBottom: 20,
          }}
        >
          The Solution: PanelForge
        </h2>

        <p
          style={{
            fontSize: 28,
            color: "#94a3b8",
            fontFamily: "system-ui, sans-serif",
            opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 60,
          }}
        >
          Simulate focus groups from real consumer opinions
        </p>

        <div style={{ textAlign: "left", margin: "0 auto", maxWidth: 900 }}>
          {features.map((feature, i) => {
            const delay = 80 + i * 50;
            const slideX = interpolate(frame, [delay, delay + 30], [-100, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const opacity = interpolate(frame, [delay, delay + 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  transform: `translateX(${slideX}px)`,
                  opacity,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  marginBottom: 30,
                  padding: "20px 30px",
                  background: "rgba(34, 197, 94, 0.06)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 20,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontSize: 30,
                    color: "white",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {feature}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
