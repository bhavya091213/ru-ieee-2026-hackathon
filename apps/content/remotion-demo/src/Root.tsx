import { Composition } from "remotion";
import { PanelForgeDemo } from "./PanelForgeDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PanelForgeDemo"
        component={PanelForgeDemo}
        durationInFrames={60 * 90}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
