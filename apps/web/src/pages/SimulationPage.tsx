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
  ingesting: "Fetching & analyzing sources (this may take a few minutes)",
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
        const sources = project.seedUrls.length > 0 ? project.seedUrls : [];
        const ingestResult = await startIngest(pid, sources, project.productName);

        if (ingestResult.data.chunk_count === 0) {
          throw new Error("No content found for this product. Try adding seed URLs (Wikipedia, reviews, Reddit threads).");
        }

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
        <div className="card-dia p-9">
          <h2 className="text-center font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
            {phase === "failed" ? "Study Failed" : phase === "done" ? "Study Complete" : "Setting Up Your Study"}
          </h2>
          <p className="mt-2 text-center text-sm text-[rgba(0,0,0,0.45)]">
            {project.productName}
          </p>

          <div className="mt-10 space-y-0">
            {PHASE_ORDER.map((p, i) => {
              if (p === "done") return null;
              const isActive = i === currentIdx;
              const isDone = i < currentIdx || phase === "done";
              const isFailed = phase === "failed" && isActive;
              return (
                <div key={p} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                      isFailed ? "bg-[#FA3D1D]/12 text-[#FA3D1D]" :
                      isDone ? "bg-emerald-50 text-emerald-600" :
                      isActive ? "bg-[rgba(0,0,0,0.9)] text-[#F8F8F8]" :
                      "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.25)]"
                    }`}>
                      {isFailed ? "!" : isDone ? "\u2713" : isActive ? (
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#F8F8F8]" />
                      ) : i + 1}
                    </div>
                    {i < PHASE_ORDER.length - 2 && (
                      <div className={`h-10 w-px ${isDone ? "bg-emerald-200" : "bg-[rgba(0,0,0,0.08)]"}`} />
                    )}
                  </div>
                  <div className="pb-10">
                    <p className={`text-[0.9375rem] font-medium ${
                      isFailed ? "text-[#FA3D1D]" : isDone ? "text-emerald-600" : isActive ? "text-[rgba(0,0,0,0.85)]" : "text-[rgba(0,0,0,0.3)]"
                    }`}>
                      {PHASE_LABELS[p]}
                    </p>
                    {isActive && p === "polling" && simPhase && (
                      <p className="mt-0.5 text-xs text-[rgba(0,0,0,0.4)]">Phase: {simPhase}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {phase === "done" && (
            <div className="mt-2 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700">
              Loading dashboard...
            </div>
          )}

          {phase === "failed" && (
            <div className="mt-2 space-y-3">
              <div className="rounded-2xl bg-[#FA3D1D]/8 p-4 text-sm text-[#D42E11]">
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
