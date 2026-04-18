import { useEffect } from "react";

import { IngestForm } from "../components/IngestForm";
import { StatusBar } from "../components/StatusBar";
import { useProject } from "../hooks/useProject";

interface HomePageProps {
  onProjectCreated: (projectId: string) => void;
}

export function HomePage({ onProjectCreated }: HomePageProps) {
  const { projectId, status, progress, error, create } = useProject();

  useEffect(() => {
    if (status === "ready" && projectId) {
      onProjectCreated(projectId);
    }
  }, [onProjectCreated, projectId, status]);

  const busy = status === "creating" || status === "ingesting" || status === "simulating";

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center">
        <section className="animate-fade-in w-full max-w-4xl rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-lg shadow-slate-200/70 backdrop-blur md:p-10">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-sky-600">
            PanelForge
          </p>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-medium leading-tight text-slate-900 md:text-5xl">
            Search a product. See the panel.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            Start with a product name, a few URLs, and one or two hypotheses.
            The app assembles a clean focus-group dashboard with mock-safe data
            when the backend is unavailable.
          </p>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            {[
              "Simple search flow",
              "Mock-safe dashboard",
              "Responsive visual layout",
              "Easy reset to search again",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4 text-sm text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 w-full max-w-2xl space-y-5 md:mt-12">
          <IngestForm disabled={busy} onCreate={create} />
          {busy ? <StatusBar percent={progress.percent} stage={progress.stage} /> : null}
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-md shadow-rose-100/70">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
