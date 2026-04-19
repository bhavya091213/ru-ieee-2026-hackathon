import { useState } from "react";
import type { ProjectContext } from "../App";
import { suggestFacets } from "../lib/api";

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
  const [facets, setFacets] = useState<string[]>([]);
  const [suggestedFacets, setSuggestedFacets] = useState<string[]>([]);
  const [facetInput, setFacetInput] = useState("");
  const [loadingFacets, setLoadingFacets] = useState(false);
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

  const addCustomFacet = () => {
    const v = facetInput.trim().toLowerCase();
    if (!v || facets.includes(v)) { setFacetInput(""); return; }
    setFacets((prev) => [...prev, v]);
    if (!suggestedFacets.includes(v)) setSuggestedFacets((prev) => [...prev, v]);
    setFacetInput("");
  };

  const handleSuggestFacets = async () => {
    setLoadingFacets(true);
    const urls = seedUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    const result = await suggestFacets(productName, description, urls);
    const suggested = result.data.facets;
    setSuggestedFacets(suggested);
    setFacets(suggested);
    setLoadingFacets(false);
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
        <div className="mb-10 flex items-center justify-center gap-3">
          {steps.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} className="flex items-center gap-3">
                {i > 0 && <div className={`h-px w-10 ${done ? "bg-[rgba(0,0,0,0.85)]" : "bg-[rgba(0,0,0,0.12)]"}`} />}
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    active
                      ? "bg-[rgba(0,0,0,0.9)] text-[#F8F8F8]"
                      : done
                        ? "bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.6)]"
                        : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.25)]"
                  }`}>
                    {done ? "\u2713" : n}
                  </div>
                  <span className={`hidden text-sm sm:inline ${active ? "font-medium text-[rgba(0,0,0,0.85)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="card-dia p-7 sm:p-9">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
                  What product are you researching?
                </h2>
                <p className="mt-2 text-[0.9375rem] text-[rgba(0,0,0,0.5)]">Give us a name and optional description.</p>
              </div>
              <div>
                <label htmlFor="pname" className="mb-2 block text-sm font-medium text-[rgba(0,0,0,0.6)]">Product name</label>
                <input id="pname" className="input-field" placeholder="e.g. iPhone 18 Pro" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pdesc" className="mb-2 block text-sm font-medium text-[rgba(0,0,0,0.6)]">Description <span className="text-[rgba(0,0,0,0.25)]">(optional)</span></label>
                <textarea id="pdesc" rows={3} className="input-field resize-none" placeholder="Brief context about the product or launch..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
                  Add source URLs
                </h2>
                <p className="mt-2 text-[0.9375rem] text-[rgba(0,0,0,0.5)]">Paste review links, Reddit threads, or YouTube videos. One per line.</p>
              </div>
              <textarea rows={6} className="input-field resize-none font-[family-name:var(--font-mono)] text-sm" placeholder={"https://reddit.com/r/smartphones/...\nhttps://youtube.com/watch?v=..."} value={seedUrls} onChange={(e) => setSeedUrls(e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
                  Hypotheses & facets
                </h2>
                <p className="mt-2 text-[0.9375rem] text-[rgba(0,0,0,0.5)]">What do you want the panel to evaluate?</p>
              </div>

              {/* Hypotheses */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[rgba(0,0,0,0.6)]">Hypotheses</label>
                {hypotheses.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {hypotheses.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(0,0,0,0.06)] px-3.5 py-1.5 text-sm text-[rgba(0,0,0,0.7)]">
                        {h}
                        <button type="button" onClick={() => setHypotheses((prev) => prev.filter((x) => x !== h))} className="text-[rgba(0,0,0,0.3)] hover:text-[rgba(0,0,0,0.7)]">&times;</button>
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
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[rgba(0,0,0,0.6)]">Facets to explore</label>
                  <button
                    type="button"
                    onClick={handleSuggestFacets}
                    disabled={loadingFacets || !productName.trim()}
                    className="btn-primary h-8 px-3 text-xs leading-8"
                  >
                    {loadingFacets ? (
                      <><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#F8F8F8] border-t-transparent" /> Generating...</>
                    ) : (
                      "AI Suggest"
                    )}
                  </button>
                </div>
                {suggestedFacets.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {suggestedFacets.map((f) => (
                      <button key={f} type="button" onClick={() => toggleFacet(f)} className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition ${
                        facets.includes(f)
                          ? "border-[rgba(0,0,0,0.3)] bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.85)]"
                          : "border-[rgba(0,0,0,0.08)] bg-transparent text-[rgba(0,0,0,0.45)] hover:bg-[rgba(0,0,0,0.04)]"
                      }`}>
                        {f}
                      </button>
                    ))}
                  </div>
                )}
                {suggestedFacets.length === 0 && !loadingFacets && (
                  <p className="mb-3 text-xs text-[rgba(0,0,0,0.35)]">Click &quot;AI Suggest&quot; to generate facets based on your product.</p>
                )}
                <div className="flex gap-2">
                  <input className="input-field flex-1" placeholder="Add custom facet..." value={facetInput} onChange={(e) => setFacetInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFacet(); } }} />
                  <button type="button" onClick={addCustomFacet} className="btn-secondary whitespace-nowrap">Add</button>
                </div>
              </div>
            </div>
          )}

          {error && <p className="mt-5 rounded-2xl bg-[#FA3D1D]/8 px-4 py-3 text-sm text-[#D42E11]">{error}</p>}

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
