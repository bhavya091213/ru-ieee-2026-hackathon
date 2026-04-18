import { useState } from "react";

import { LandingPage } from "./pages/LandingPage";
import { WizardPage } from "./pages/WizardPage";
import { SimulationPage } from "./pages/SimulationPage";
import { DashboardPage } from "./pages/DashboardPage";

type Page = "landing" | "wizard" | "simulation" | "dashboard";

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

  if (page === "dashboard") {
    return (
      <DashboardPage
        projectId={project.projectId}
        productName={project.productName}
        onNewStudy={reset}
      />
    );
  }

  return <LandingPage onStart={() => setPage("wizard")} />;
}
