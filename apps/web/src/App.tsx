import { useState } from "react";

import { AnimatedBackground } from "./components/AnimatedBackground";
import { LandingPage } from "./pages/LandingPage";
import { WizardPage } from "./pages/WizardPage";
import { SimulationPage } from "./pages/SimulationPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExplorePage } from "./pages/ExplorePage";

type Page = "landing" | "wizard" | "simulation" | "dashboard" | "explore";

export interface ProjectContext {
  projectId: string | null;
  productName: string;
  description: string;
  hypotheses: string[];
  facets: string[];
  seedUrls: string[];
}

const emptyProject: ProjectContext = {
  projectId: null,
  productName: "",
  description: "",
  hypotheses: [],
  facets: [],
  seedUrls: [],
};

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [project, setProject] = useState<ProjectContext>(emptyProject);

  const reset = () => {
    setProject(emptyProject);
    setPage("landing");
  };

  let content: React.ReactNode;

  if (page === "wizard") {
    content = (
      <WizardPage
        onSubmit={(ctx) => { setProject(ctx); setPage("simulation"); }}
        onBack={reset}
      />
    );
  } else if (page === "simulation") {
    content = (
      <SimulationPage
        project={project}
        onComplete={(projectId) => { setProject((p) => ({ ...p, projectId })); setPage("dashboard"); }}
        onError={reset}
      />
    );
  } else if (page === "explore") {
    content = (
      <ExplorePage
        projectId={project.projectId}
        productName={project.productName}
        dashboard={null}
        onBack={() => setPage("dashboard")}
      />
    );
  } else if (page === "dashboard") {
    content = (
      <DashboardPage
        projectId={project.projectId}
        productName={project.productName}
        onNewStudy={reset}
        onExplore={() => setPage("explore")}
      />
    );
  } else {
    content = <LandingPage onStart={() => setPage("wizard")} />;
  }

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10">{content}</div>
    </>
  );
}
