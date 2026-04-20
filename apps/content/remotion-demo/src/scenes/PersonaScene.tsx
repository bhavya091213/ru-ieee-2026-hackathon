import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const personas = [
  {
    label: "Early Adopter",
    color: "#6366f1",
    priorities: ["Innovation", "Features", "Speed"],
    stance: "Excited but skeptical of claims",
  },
  {
    label: "Privacy Advocate",
    color: "#ec4899",
    priorities: ["Data Security", "Transparency", "Control"],
    stance: "Concerned about data collection",
  },
  {
    label: "Budget Consumer",
    color: "#f59e0b",
    priorities: ["Price", "Value", "Durability"],
    stance: "Needs clear ROI justification",
  },
  {
    label: "Power User",
    color: "#22c55e",
    priorities: ["Performance", "Ecosystem", "Customization"],
    stance: "Wants technical depth",
  },
];

export const PersonaScene: React.FC = () => {
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
            marginBottom: 60,
          }}
        >
          AI-Generated Personas
        </h2>

        <p
          style={{
            fontSize: 24,
            color: "#94a3b8",
            fontFamily: "system-ui, sans-serif",
            opacity: interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: 50,
          }}
        >
          Clustered from real consumer opinions using Leiden algorithm
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 30,
            flexWrap: "wrap",
          }}
        >
          {personas.map((persona, i) => {
            const delay = 60 + i * 60;
            const slideY = interpolate(frame, [delay, delay + 30], [50, 0], {
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
                  transform: `translateY(${slideY}px)`,
                  opacity,
                  background: `${persona.color}10`,
                  border: `1px solid ${persona.color}50`,
                  borderRadius: 16,
                  padding: "30px 25px",
                  width: 320,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 15,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: persona.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: persona.color,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {persona.label}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 16,
                    color: "#94a3b8",
                    fontFamily: "system-ui, sans-serif",
                    marginBottom: 12,
                    fontStyle: "italic",
                  }}
                >
                  "{persona.stance}"
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {persona.priorities.map((p, j) => (
                    <span
                      key={j}
                      style={{
                        fontSize: 13,
                        color: persona.color,
                        background: `${persona.color}20`,
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontFamily: "system-ui, sans-serif",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
