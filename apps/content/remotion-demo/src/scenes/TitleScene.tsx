import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12 } });
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });

  const gradientRotation = interpolate(frame, [0, 600], [0, 360]);

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
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div style={{ textAlign: "center", transform: `scale(${titleScale})` }}>
        <h1
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: "white",
            fontFamily: "system-ui, -apple-system, sans-serif",
            margin: 0,
            letterSpacing: -3,
            background: "linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #818cf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          PanelForge
        </h1>

        <p
          style={{
            fontSize: 36,
            color: "#a5b4fc",
            opacity: subtitleOpacity,
            marginTop: 20,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 300,
          }}
        >
          Synthetic Focus Groups, Powered by AI
        </p>

        <p
          style={{
            fontSize: 22,
            color: "#6366f1",
            opacity: taglineOpacity,
            marginTop: 30,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
          }}
        >
          Built in 24 hours at RUIEEE Buildathon
        </p>
      </div>
    </AbsoluteFill>
  );
};
