import { useState } from "react";

import { HomePage } from "./pages/HomePage";
import { ProjectDashboard } from "./pages/ProjectDashboard";

type Page = "home" | "dashboard";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [searchSession, setSearchSession] = useState(0);

  const resetSearch = () => {
    setProjectId(null);
    setPage("home");
    setSearchSession((current) => current + 1);
  };

  if (page === "dashboard") {
    return <ProjectDashboard onSearchAgain={resetSearch} projectId={projectId} />;
  }

  return (
    <HomePage
      key={searchSession}
      onProjectCreated={(id) => {
        setProjectId(id);
        setPage("dashboard");
      }}
    />
  );
}
