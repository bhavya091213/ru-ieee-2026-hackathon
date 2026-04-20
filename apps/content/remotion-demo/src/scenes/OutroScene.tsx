import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12 } });
  const ctaOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });

  const gradientRotation = interpolate(frame, [0, 600], [0, 180]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: `linear-gradient(${gradientRotation}deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      <div style={{ textAlign: "center", transform: `scale(${titleScale})` }}>
        <h1
          style={{
            fontSize: 90,
            fontWeight: 800,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            margin: 0,
            letterSpacing: -2,
            background: "linear-gradient(135deg, #fff 0%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          PanelForge
        </h1>

        <p
          style={{
            fontSize: 32,
            color: "#94a3b8",
            marginTop: 20,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Evidence-backed consumer insights in 60 seconds
        </p>

        <div
          style={{
            opacity: ctaOpacity,
            marginTop: 60,
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              padding: "16px 40px",
              borderRadius: 12,
              fontSize: 24,
              color: "white",
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            github.com/your-repo/panelforge
          </div>

          <p
            style={{
              fontSize: 20,
              color: "#6366f1",
              fontFamily: "system-ui, sans-serif",
              marginTop: 20,
            }}
          >
            Built in 24 hours at RUIEEE Buildathon | Team of 3
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
