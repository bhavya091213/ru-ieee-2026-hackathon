import { useState } from "react";

interface ScenarioEditorProps {
  onRerun: () => Promise<void>;
}

export function ScenarioEditor({ onRerun }: ScenarioEditorProps) {
  const [draft, setDraft] = useState("");
  const [hypotheses, setHypotheses] = useState<string[]>([
    "Camera proof should lead the launch narrative.",
    "Price support is required for student conversion.",
  ]);
  const [busy, setBusy] = useState(false);

  const addDraft = () => {
    const value = draft.trim();
    if (!value) {
      return;
    }
    setHypotheses((current) => [...current, value]);
    setDraft("");
  };

  const handleRerun = async () => {
    setBusy(true);
    await onRerun();
    setBusy(false);
  };

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <h2 className="font-display text-xl text-white">Scenario Editor</h2>
      <p className="mt-2 text-sm text-slate-400">
        Capture new hypotheses before triggering a fresh mock simulation.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {hypotheses.map((hypothesis) => (
          <span
            key={hypothesis}
            className="rounded-full bg-violet-400/15 px-3 py-2 text-sm text-violet-100"
          >
            {hypothesis}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-50 outline-none transition focus:border-violet-400"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add another hypothesis"
          type="text"
          value={draft}
        />
        <div className="flex gap-3">
          <button
            className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-600"
            onClick={addDraft}
            type="button"
          >
            Add
          </button>
          <button
            className="rounded-xl bg-violet-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => void handleRerun()}
            type="button"
          >
            {busy ? "Re-running..." : "Re-run simulation"}
          </button>
        </div>
      </div>
    </section>
  );
}
