import { useState } from "react";
import type { ProjectContext } from "../App";

const AVAILABLE_FACETS = ["camera", "battery", "price", "design", "privacy", "ecosystem"] as const;

interface WizardPageProps {
  onSubmit: (ctx: ProjectContext) => void;
  onBack: () => void;
}

export function WizardPage({ onSubmit, onBack }: WizardPageProps) {
  const [step, setStep] = useState(1);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [seedUrls, setSeedUrls] = useState("");
  const [hypothesisInput, setHypothesisInput] = useState("");
  const [hypotheses, setHypotheses] = useState<string[]>([]);
  const [facets, setFacets] = useState<string[]>(["camera", "battery", "price"]);
  const [error, setError] = useState<string | null>(null);

  const steps = ["Product Info", "Sources", "Hypotheses & Facets"];

  const toggleFacet = (f: string) =>
    setFacets((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const addHypothesis = () => {
    const v = hypothesisInput.trim();
    if (!v || hypotheses.includes(v)) return;
    setHypotheses((h) => [...h, v]);
    setHypothesisInput("");
  };

  const canProceed = () => {
    if (step === 1) return productName.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return hypotheses.length > 0 && facets.length > 0;
    return false;
  };

  const handleNext = () => {
    setError(null);
    if (step < 3) { setStep(step + 1); return; }
    if (!canProceed()) { setError("Add at least one hypothesis and one facet."); return; }
    onSubmit({
      projectId: null,
      productName: productName.trim(),
      description: description.trim(),
      hypotheses,
      facets,
      seedUrls: seedUrls.split("\n").map((u) => u.trim()).filter(Boolean),
    });
  };

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-xl animate-fade-in">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {steps.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} className="flex items-center gap-3">
                {i > 0 && <div className={`h-px w-8 ${done ? "bg-blue-600" : "bg-gray-200"}`} />}
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                    {done ? "\u2713" : n}
                  </div>
                  <span className={`hidden text-sm sm:inline ${active ? "font-medium text-gray-900" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">What product are you researching?</h2>
                <p className="mt-1 text-sm text-gray-500">Give us a name and optional description.</p>
              </div>
              <div>
                <label htmlFor="pname" className="mb-1.5 block text-sm font-medium text-gray-700">Product name</label>
                <input id="pname" className="input-field" placeholder="e.g. iPhone 18 Pro" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pdesc" className="mb-1.5 block text-sm font-medium text-gray-700">Description <span className="text-gray-400">(optional)</span></label>
                <textarea id="pdesc" rows={3} className="input-field resize-none" placeholder="Brief context about the product or launch..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add source URLs</h2>
                <p className="mt-1 text-sm text-gray-500">Paste review links, Reddit threads, or YouTube videos. One per line. Skip to use mock data.</p>
              </div>
              <textarea rows={6} className="input-field resize-none font-mono text-sm" placeholder={"https://reddit.com/r/smartphones/...\nhttps://youtube.com/watch?v=..."} value={seedUrls} onChange={(e) => setSeedUrls(e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Hypotheses & facets</h2>
                <p className="mt-1 text-sm text-gray-500">What do you want the panel to evaluate?</p>
              </div>

              {/* Hypotheses */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Hypotheses</label>
                {hypotheses.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {hypotheses.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                        {h}
                        <button type="button" onClick={() => setHypotheses((prev) => prev.filter((x) => x !== h))} className="text-blue-400 hover:text-blue-600">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input className="input-field flex-1" placeholder="e.g. Camera quality drives adoption" value={hypothesisInput} onChange={(e) => setHypothesisInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHypothesis(); } }} />
                  <button type="button" onClick={addHypothesis} className="btn-secondary whitespace-nowrap">Add</button>
                </div>
              </div>

              {/* Facets */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Facets to explore</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_FACETS.map((f) => (
                    <button key={f} type="button" onClick={() => toggleFacet(f)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition ${facets.includes(f) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between">
            <button type="button" onClick={step === 1 ? onBack : () => setStep(step - 1)} className="btn-secondary">
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <button type="button" onClick={handleNext} disabled={!canProceed()} className="btn-primary">
              {step === 3 ? "Run Study" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
