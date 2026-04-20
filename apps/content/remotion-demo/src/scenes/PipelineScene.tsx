import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const stages = [
  { label: "Ingest", desc: "Reddit, YouTube, Web", color: "#3b82f6" },
  { label: "Chunk", desc: "500-token windows", color: "#8b5cf6" },
  { label: "Embed", desc: "384-dim vectors", color: "#ec4899" },
  { label: "Index", desc: "ChromaDB HNSW", color: "#f59e0b" },
  { label: "Cluster", desc: "Leiden algorithm", color: "#22c55e" },
];

export const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "#0f0f23",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", width: "100%" }}>
        <h2
          style={{
            fontSize: 56,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 700,
            opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 80,
          }}
        >
          Data Pipeline
        </h2>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
          }}
        >
          {stages.map((stage, i) => {
            const delay = 40 + i * 60;
            const scale = spring({ frame: frame - delay, fps, config: { damping: 10 } });
            const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const arrowOpacity = i < stages.length - 1
              ? interpolate(frame, [delay + 30, delay + 50], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0;

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div
                  style={{
                    transform: `scale(${Math.max(0, scale)})`,
                    opacity: Math.max(0, opacity),
                    background: `${stage.color}15`,
                    border: `2px solid ${stage.color}`,
                    borderRadius: 16,
                    padding: "30px 35px",
                    textAlign: "center",
                    minWidth: 160,
                  }}
                >
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: stage.color,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {stage.label}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      color: "#94a3b8",
                      fontFamily: "system-ui, sans-serif",
                      marginTop: 8,
                    }}
                  >
                    {stage.desc}
                  </div>
                </div>

                {i < stages.length - 1 && (
                  <div
                    style={{
                      fontSize: 30,
                      color: "#4b5563",
                      opacity: arrowOpacity,
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
