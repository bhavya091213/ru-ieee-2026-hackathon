import { useState } from "react";

import { createProject, runSimulation, startIngest } from "../lib/api";

type ProjectStatus =
  | "idle"
  | "creating"
  | "ingesting"
  | "simulating"
  | "ready"
  | "error";

interface ProgressState {
  stage: string;
  percent: number | null;
}

export function useProject() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectStatus>("idle");
  const [progress, setProgress] = useState<ProgressState>({
    stage: "Waiting for input",
    percent: null,
  });
  const [error, setError] = useState<string | null>(null);

  const create = async (name: string, urls: string[], hypotheses: string[]) => {
    try {
      setError(null);
      setStatus("creating");
      setProgress({ stage: "Creating project...", percent: null });

      const projectResult = await createProject(name, urls, hypotheses);
      const nextProjectId = projectResult.data.project_id;
      setProjectId(nextProjectId);

      setStatus("ingesting");
      setProgress({ stage: "Ingesting sources...", percent: null });
      await startIngest(nextProjectId);

      setStatus("ready");
      setProgress({ stage: "Sources ready", percent: 100 });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to create project");
    }
  };

  const simulate = async () => {
    if (!projectId) {
      return;
    }

    try {
      setError(null);
      setStatus("simulating");
      setProgress({ stage: "Running simulation...", percent: null });
      await runSimulation(projectId);
      setStatus("ready");
      setProgress({ stage: "Simulation complete", percent: 100 });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to run simulation");
    }
  };

  return {
    projectId,
    status,
    progress,
    error,
    create,
    simulate,
  };
}
