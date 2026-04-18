import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectContext } from "../App";
import { createProject, pollSimulationStatus, runSimulation, startIngest } from "../lib/api";

interface SimulationPageProps {
  project: ProjectContext;
  onComplete: (projectId: string) => void;
  onError: () => void;
}

type Phase = "creating" | "ingesting" | "simulating" | "polling" | "done" | "failed";

const PHASE_LABELS: Record<Phase, string> = {
  creating: "Creating project",
  ingesting: "Ingesting sources",
  simulating: "Starting simulation",
  polling: "Running simulation",
  done: "Complete",
  failed: "Failed",
};

const PHASE_ORDER: Phase[] = ["creating", "ingesting", "simulating", "polling", "done"];

export function SimulationPage({ project, onComplete, onError }: SimulationPageProps) {
  const [phase, setPhase] = useState<Phase>("creating");
  const [simPhase, setSimPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ranRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        setPhase("creating");
        const createResult = await createProject(project.productName, project.seedUrls, project.hypotheses);
        const pid = createResult.data.project_id;

        setPhase("ingesting");
        const sources = project.seedUrls.length > 0 ? project.seedUrls : ["mock://consumer-electronics"];
        await startIngest(pid, sources);

        setPhase("simulating");
        await runSimulation(pid, project.productName, project.description, project.hypotheses, project.facets);

        setPhase("polling");
        pollRef.current = setInterval(async () => {
          const status = await pollSimulationStatus(pid);
          const s = status.data;
          setSimPhase(s.phase);
          if (s.done) {
            stopPolling();
            if (s.phase === "DONE" || !s.error) {
              setPhase("done");
              setTimeout(() => onComplete(pid), 800);
            } else {
              setPhase("failed");
              setError(s.error);
            }
          }
        }, 1500);
      } catch (err) {
        setPhase("failed");
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();

    return stopPolling;
  }, [project, onComplete, stopPolling]);

  const currentIdx = PHASE_ORDER.indexOf(phase === "failed" ? "polling" : phase);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-center text-xl font-semibold text-gray-900">
            {phase === "failed" ? "Study Failed" : phase === "done" ? "Study Complete" : "Setting Up Your Study"}
          </h2>
          <p className="mt-1 text-center text-sm text-gray-500">
            {project.productName}
          </p>

          <div className="mt-8 space-y-0">
            {PHASE_ORDER.map((p, i) => {
              if (p === "done") return null;
              const isActive = i === currentIdx;
              const isDone = i < currentIdx || phase === "done";
              const isFailed = phase === "failed" && isActive;
              return (
                <div key={p} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isFailed ? "bg-red-100 text-red-600" :
                      isDone ? "bg-green-100 text-green-600" :
                      isActive ? "bg-blue-100 text-blue-600" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {isFailed ? "!" : isDone ? "\u2713" : isActive ? (
                        <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
                      ) : i + 1}
                    </div>
                    {i < PHASE_ORDER.length - 2 && (
                      <div className={`h-10 w-px ${isDone ? "bg-green-200" : "bg-gray-200"}`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="pb-10">
                    <p className={`text-sm font-medium ${
                      isFailed ? "text-red-600" : isDone ? "text-green-600" : isActive ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {PHASE_LABELS[p]}
                    </p>
                    {isActive && p === "polling" && simPhase && (
                      <p className="mt-0.5 text-xs text-gray-400">Phase: {simPhase}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {phase === "done" && (
            <div className="mt-2 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700">
              Loading dashboard...
            </div>
          )}

          {phase === "failed" && (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error ?? "An unknown error occurred."}
              </div>
              <button type="button" onClick={onError} className="btn-secondary w-full">
                Start Over
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
