import { useCallback, useRef, useState } from "react";

import {
  createProject,
  pollSimulationStatus,
  runSimulation,
  startIngest,
} from "../lib/api";

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const create = async (name: string, urls: string[], hypotheses: string[]) => {
    try {
      setError(null);
      setStatus("creating");
      setProgress({ stage: "Creating project...", percent: null });

      const projectResult = await createProject(name, urls, hypotheses);
      const nextProjectId = projectResult.data.project_id;
      setProjectId(nextProjectId);

      setStatus("ingesting");
      setProgress({ stage: "Fetching & chunking sources...", percent: null });
      await startIngest(nextProjectId, urls, name);

      setStatus("simulating");
      setProgress({ stage: "Starting simulation...", percent: null });

      await runSimulation(nextProjectId, name, hypotheses.join("; "), hypotheses, []);

      stopPolling();
      pollRef.current = setInterval(async () => {
        const result = await pollSimulationStatus(nextProjectId);
        const s = result.data;

        setProgress({
          stage: s.done
            ? s.phase === "DONE"
              ? "Simulation complete"
              : `Failed: ${s.error ?? "unknown error"}`
            : `Phase: ${s.phase}`,
          percent: null,
        });

        if (s.done) {
          stopPolling();
          if (s.error) {
            setStatus("error");
            setError(s.error);
          } else {
            setStatus("ready");
            setProgress({ stage: "Simulation complete", percent: 100 });
          }
        }
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to create project");
    }
  };

  const simulate = async (
    productName: string,
    description: string,
    hypotheses: string[],
    facets: string[],
  ) => {
    if (!projectId) {
      return;
    }

    try {
      setError(null);
      setStatus("simulating");
      setProgress({ stage: "Starting simulation...", percent: null });

      await runSimulation(projectId, productName, description, hypotheses, facets);

      stopPolling();
      pollRef.current = setInterval(async () => {
        const result = await pollSimulationStatus(projectId);
        const s = result.data;

        setProgress({
          stage: s.phase === "DONE" ? "Simulation complete" : `Phase: ${s.phase}`,
          percent: null,
        });

        if (s.done) {
          stopPolling();
          if (s.phase === "DONE") {
            setStatus("ready");
            setProgress({ stage: "Simulation complete", percent: 100 });
          } else {
            setStatus("error");
            setError(s.error ?? "Simulation failed");
          }
        }
      }, 2000);
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
    stopPolling,
  };
}
