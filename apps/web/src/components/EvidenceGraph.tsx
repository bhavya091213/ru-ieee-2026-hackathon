import { useMemo, useState } from "react";

import { mockGraphLinks, mockGraphNodes } from "../lib/mockData";

const TYPE_CLASSES: Record<string, string> = {
  Product: "bg-cyan-400/20 text-cyan-200",
  Feature: "bg-emerald-400/20 text-emerald-200",
  Concern: "bg-rose-400/20 text-rose-200",
  Segment: "bg-violet-400/20 text-violet-200",
  Competitor: "bg-amber-400/20 text-amber-200",
};

export function EvidenceGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("product");
  const selectedNode = useMemo(
    () => mockGraphNodes.find((node) => node.id === selectedNodeId) ?? mockGraphNodes[0],
    [selectedNodeId],
  );

  const relatedLinks = mockGraphLinks.filter(
    (link) => link.source === selectedNode.id || link.target === selectedNode.id,
  );

  return (
    <section className="rounded-[1.75rem] border border-white/8 bg-slate-900/80 p-6 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-white">Evidence Graph</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lightweight explorer placeholder until graph API data is available.
          </p>
        </div>
        <span className="rounded-full border border-white/8 px-3 py-2 text-xs uppercase tracking-[0.25em] text-slate-300">
          Interactive mock
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-slate-950/70 p-4">
          {mockGraphNodes.map((node) => (
            <button
              key={node.id}
              className={`rounded-2xl border px-4 py-5 text-left transition hover:-translate-y-0.5 ${
                selectedNode.id === node.id
                  ? "border-cyan-300/50 bg-cyan-400/10"
                  : "border-white/8 bg-slate-900/70"
              }`}
              onClick={() => setSelectedNodeId(node.id)}
              type="button"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {node.type}
              </p>
              <p className="mt-2 text-sm font-medium text-white">{node.label}</p>
            </button>
          ))}
        </div>

        <aside className="rounded-2xl border border-white/8 bg-slate-950/70 p-5">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs ${TYPE_CLASSES[selectedNode.type]}`}
          >
            {selectedNode.type}
          </span>
          <h3 className="mt-4 font-display text-lg text-white">{selectedNode.label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {selectedNode.description}
          </p>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Linked evidence paths
            </p>
            <div className="mt-3 space-y-3">
              {relatedLinks.map((link) => (
                <div
                  key={`${link.source}-${link.target}`}
                  className="rounded-xl border border-white/8 bg-slate-900/80 p-3 text-sm text-slate-200"
                >
                  {link.source} {"->"} {link.target} ({link.label})
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
