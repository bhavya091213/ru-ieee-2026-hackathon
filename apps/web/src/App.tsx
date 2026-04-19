import { useState } from "react";

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

  if (page === "wizard") {
    return (
      <WizardPage
        onSubmit={(ctx) => {
          setProject(ctx);
          setPage("simulation");
        }}
        onBack={reset}
      />
    );
  }

  if (page === "simulation") {
    return (
      <SimulationPage
        project={project}
        onComplete={(projectId) => {
          setProject((p) => ({ ...p, projectId }));
          setPage("dashboard");
        }}
        onError={reset}
      />
    );
  }

  if (page === "explore") {
    return (
      <ExplorePage
        projectId={project.projectId}
        productName={project.productName}
        dashboard={null}
        onBack={() => setPage("dashboard")}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <DashboardPage
        projectId={project.projectId}
        productName={project.productName}
        onNewStudy={reset}
        onExplore={() => setPage("explore")}
      />
    );
  }

  return <LandingPage onStart={() => setPage("wizard")} />;
}
