import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { PipelineScene } from "./scenes/PipelineScene";
import { PersonaScene } from "./scenes/PersonaScene";
import { SimulationScene } from "./scenes/SimulationScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { TechStackScene } from "./scenes/TechStackScene";
import { OutroScene } from "./scenes/OutroScene";

const SCENE_DURATION = 600; // 10 seconds each at 60fps

export const PanelForgeDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0f23" }}>
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <TitleScene />
      </Sequence>

      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <ProblemScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
        <SolutionScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
        <PipelineScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 4} durationInFrames={SCENE_DURATION}>
        <PersonaScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 5} durationInFrames={SCENE_DURATION}>
        <SimulationScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 6} durationInFrames={SCENE_DURATION}>
        <DashboardScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 7} durationInFrames={SCENE_DURATION}>
        <TechStackScene />
      </Sequence>

      <Sequence from={SCENE_DURATION * 8} durationInFrames={SCENE_DURATION}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
