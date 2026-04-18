interface StatusBarProps {
  stage: string;
  percent: number | null;
}

export function StatusBar({ stage, percent }: StatusBarProps) {
  return (
    <div className="animate-fade-in rounded-2xl border border-sky-200 bg-white/90 p-4 shadow-lg shadow-sky-100/80">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-600">
            Status
          </p>
          <p className="mt-1 text-sm text-slate-600">{stage}</p>
        </div>
        <div className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">
          {percent === null ? "Working" : `${percent}%`}
        </div>
      </div>
    </div>
  );
}
