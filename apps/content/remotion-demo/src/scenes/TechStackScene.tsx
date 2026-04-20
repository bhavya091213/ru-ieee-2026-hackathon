import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const stack = [
  { category: "Backend", items: ["Python", "FastAPI", "Pydantic v2", "asyncio"], color: "#3b82f6" },
  { category: "AI/LLM", items: ["Gemini 2.5 Flash", "Structured Output", "Prompt Caching"], color: "#8b5cf6" },
  { category: "Data", items: ["ChromaDB", "Sentence Transformers", "Leiden Algorithm"], color: "#22c55e" },
  { category: "Frontend", items: ["React 19", "Tailwind CSS 4", "Recharts", "GSAP"], color: "#ec4899" },
];

export const TechStackScene: React.FC = () => {
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
          Tech Stack
        </h2>

        <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          {stack.map((group, i) => {
            const delay = 40 + i * 50;
            const slideY = interpolate(frame, [delay, delay + 30], [40, 0], {
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
                  background: `${group.color}08`,
                  border: `1px solid ${group.color}40`,
                  borderRadius: 16,
                  padding: "30px 35px",
                  minWidth: 280,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: group.color,
                    fontFamily: "system-ui, sans-serif",
                    marginBottom: 20,
                  }}
                >
                  {group.category}
                </div>

                {group.items.map((item, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: 18,
                      color: "#e2e8f0",
                      fontFamily: "system-ui, sans-serif",
                      padding: "6px 0",
                      borderBottom: j < group.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
