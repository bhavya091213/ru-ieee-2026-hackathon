import type { DashboardPayload } from "../lib/types";

interface HeaderProps {
  data: DashboardPayload;
  dataSource: "live" | "mock";
  onSearchAgain?: () => void;
}

function buildMeta(data: DashboardPayload) {
  const chunkCount = new Set(
    [...data.round1_responses, ...data.round2_responses].flatMap(
      (response) => response.cited_chunk_ids,
    ),
  ).size;

  return [
    `${data.personas.length} Personas`,
    `${chunkCount} Evidence Chunks`,
    "2 Rounds",
    data.tribe?.enabled ? "TRIBE Active" : "TRIBE Off",
  ];
}

export function Header({ data, dataSource, onSearchAgain }: HeaderProps) {
  const showBadge = import.meta.env.VITE_SHOW_DATA_SOURCE === "true";
  const badgeClass =
    dataSource === "mock"
      ? "bg-amber-100 text-amber-700 ring-amber-200"
      : "bg-emerald-100 text-emerald-700 ring-emerald-200";

  return (
    <header className="animate-fade-in rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-lg shadow-slate-200/70 backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.35em] text-sky-600">
            PanelForge
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium text-slate-900">
            iPhone 18 Focus Group
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Camera and battery lead the story. Price and privacy still hold the
            tension.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showBadge ? (
            <div
              className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] ring-1 ${badgeClass}`}
            >
              {dataSource === "mock" ? "MOCK DATA" : "LIVE DATA"}
            </div>
          ) : null}
          {onSearchAgain ? (
            <button
              className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={onSearchAgain}
              type="button"
            >
              Search again
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {buildMeta(data).map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-600"
          >
            {item}
          </span>
        ))}
      </div>
    </header>
  );
}
