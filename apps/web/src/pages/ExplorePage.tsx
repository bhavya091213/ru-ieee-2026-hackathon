import { useCallback, useEffect, useState } from "react";
import { getPersonaColor } from "../lib/colors";
import type { DashboardPayload, PersonaSummary } from "../lib/types";

interface ExplorePageProps {
  projectId: string | null;
  productName: string;
  dashboard: DashboardPayload | null;
  onBack: () => void;
}

type Tab = "documents" | "chunks" | "graph" | "personas";

interface DocInfo {
  filename: string;
  title: string;
  source_url: string;
  source_type: string;
  size_bytes: number;
  preview: string;
}

interface ChunkInfo {
  chunk_id: string;
  doc_id: string;
  text: string;
  section_title: string | null;
  facet: string;
  stance: string;
  evidence_score: number;
  claims: string[];
}

interface GraphNode {
  id: string;
  title: string;
  type: string;
  description: string;
  community_id: string;
  chunk_count: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  description: string;
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: Record<string, string>;
}

const FACET_COLORS: Record<string, string> = {
  camera: "bg-[#0358F7]/10 text-[#0358F7]",
  battery: "bg-emerald-50 text-emerald-700",
  price: "bg-[#FFB005]/10 text-[#9A6B00]",
  design: "bg-[#C679C4]/15 text-[#9B4E99]",
  privacy: "bg-[#FA3D1D]/10 text-[#D42E11]",
  ecosystem: "bg-[#5092C7]/15 text-[#3A6F9A]",
  other: "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]",
  web_article: "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]",
  reddit_post: "bg-[#FA3D1D]/10 text-[#D42E11]",
  youtube: "bg-[#FA3D1D]/8 text-[#D42E11]",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  Product: "bg-[#0358F7]",
  Feature: "bg-emerald-500",
  Concern: "bg-[#FA3D1D]",
  Competitor: "bg-[#FFB005]",
  Segment: "bg-[#C679C4]",
  Claim: "bg-[#5092C7]",
};

export function ExplorePage({ projectId, productName, dashboard, onBack }: ExplorePageProps) {
  const [tab, setTab] = useState<Tab>("documents");
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [chunkTotal, setChunkTotal] = useState(0);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [], communities: {} });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [facetFilter, setFacetFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaSummary | null>(null);

  const fetchData = useCallback(async (endpoint: string) => {
    try {
      const resp = await fetch(endpoint);
      if (resp.ok) return await resp.json();
    } catch { /* fall through */ }
    return null;
  }, []);

  useEffect(() => {
    if (tab === "documents") {
      setLoading(true);
      fetchData("/api/explore/documents").then((d) => {
        if (d) setDocs(d.documents || []);
        setLoading(false);
      });
    }
  }, [tab, fetchData]);

  useEffect(() => {
    if (tab === "chunks") {
      setLoading(true);
      const params = new URLSearchParams();
      if (facetFilter) params.set("facet", facetFilter);
      params.set("limit", "100");
      fetchData(`/api/explore/chunks?${params}`).then((d) => {
        if (d) { setChunks(d.chunks || []); setChunkTotal(d.total || 0); }
        setLoading(false);
      });
    }
  }, [tab, facetFilter, fetchData]);

  useEffect(() => {
    if (tab === "graph") {
      setLoading(true);
      fetchData("/api/explore/graph").then((d) => {
        if (d) setGraph(d);
        setLoading(false);
      });
    }
  }, [tab, fetchData]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "documents", label: "Sources", count: docs.length },
    { key: "chunks", label: "Chunks", count: chunkTotal },
    { key: "graph", label: "Knowledge Graph", count: graph.nodes.length },
    { key: "personas", label: "Persona Evidence", count: dashboard?.personas.length ?? 0 },
  ];

  const relatedEdges = selectedNode
    ? graph.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-[rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <span className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.15em] text-[rgba(0,0,0,0.5)]">PanelForge</span>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
              Data Explorer — {productName || "Project"}
            </h1>
          </div>
          <button type="button" onClick={onBack} className="btn-secondary text-sm">Back to Dashboard</button>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-8">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`border-b-2 pb-3 pt-1 text-sm font-medium transition ${tab === t.key ? "border-[rgba(0,0,0,0.85)] text-[rgba(0,0,0,0.85)]" : "border-transparent text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.6)]"}`}>
                {t.label} {t.count ? <span className="ml-1 text-xs text-[rgba(0,0,0,0.3)]">({t.count})</span> : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading && <div className="py-12 text-center text-[rgba(0,0,0,0.35)]">Loading...</div>}

        {/* Documents */}
        {tab === "documents" && !loading && (
          <div className="animate-fade-in space-y-3">
            {docs.length === 0 && <p className="py-8 text-center text-[rgba(0,0,0,0.4)]">No documents ingested yet.</p>}
            {docs.map((d) => (
              <div key={d.filename} className="card-dia p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-[rgba(0,0,0,0.85)]">{d.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${FACET_COLORS[d.source_type] ?? FACET_COLORS.other}`}>
                        {d.source_type}
                      </span>
                    </div>
                    {d.source_url && <p className="mt-1 truncate text-xs text-[rgba(0,0,0,0.35)]">{d.source_url}</p>}
                    <p className="mt-2 text-sm leading-relaxed text-[rgba(0,0,0,0.5)] line-clamp-3">{d.preview}</p>
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.3)]">{(d.size_bytes / 1024).toFixed(1)}KB</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chunks */}
        {tab === "chunks" && !loading && (
          <div className="animate-fade-in">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-[rgba(0,0,0,0.5)]">Filter:</span>
              {["", "camera", "battery", "price", "design", "privacy", "ecosystem", "web_article", "reddit_post", "youtube"].map((f) => (
                <button key={f} type="button" onClick={() => setFacetFilter(f)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition ${facetFilter === f ? "border-[rgba(0,0,0,0.3)] bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.85)]" : "border-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.45)] hover:bg-[rgba(0,0,0,0.04)]"}`}>
                  {f || "All"}
                </button>
              ))}
            </div>
            <p className="mb-3 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">{chunkTotal} chunks total, showing {chunks.length}</p>
            <div className="space-y-2">
              {chunks.map((c) => (
                <div key={c.chunk_id} className="card-dia p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-[rgba(0,0,0,0.04)] px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.4)]">{c.chunk_id.slice(0, 12)}</code>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${FACET_COLORS[c.facet] ?? FACET_COLORS.other}`}>{c.facet}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${c.stance === "positive" ? "border-emerald-200 text-emerald-600" : c.stance === "negative" ? "border-[#FA3D1D]/20 text-[#FA3D1D]" : "border-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.45)]"}`}>{c.stance}</span>
                    {c.evidence_score > 0 && <span className="font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">score: {(c.evidence_score * 100).toFixed(0)}%</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-[rgba(0,0,0,0.7)]">{c.text}</p>
                  {c.claims.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.claims.map((cl, i) => (
                        <span key={i} className="rounded-lg bg-[rgba(0,0,0,0.04)] px-2 py-0.5 text-xs text-[rgba(0,0,0,0.45)]">{cl}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Graph */}
        {tab === "graph" && !loading && (
          <div className="animate-fade-in">
            {graph.nodes.length === 0 ? (
              <p className="py-8 text-center text-[rgba(0,0,0,0.4)]">No graph data available. Run ingestion with graph extraction first.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <div>
                  <div className="mb-4 flex items-center gap-4">
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-light text-[rgba(0,0,0,0.85)]">Entities ({graph.nodes.length})</h2>
                    <div className="flex gap-2">
                      {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => (
                        <span key={type} className="flex items-center gap-1 text-xs text-[rgba(0,0,0,0.45)]">
                          <span className={`h-2 w-2 rounded-full ${color}`} /> {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {graph.nodes.map((n) => (
                      <button key={n.id} type="button" onClick={() => setSelectedNode(n)}
                        className={`card-dia p-3.5 text-left transition ${selectedNode?.id === n.id ? "ring-2 ring-[rgba(0,0,0,0.2)]" : "hover:shadow-[var(--shadow-card-hover)]"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${NODE_TYPE_COLORS[n.type] ?? "bg-[rgba(0,0,0,0.2)]"}`} />
                          <span className="truncate text-sm font-medium text-[rgba(0,0,0,0.8)]">{n.title}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-[rgba(0,0,0,0.4)] line-clamp-2">{n.description}</p>
                        <div className="mt-2 flex gap-2 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.3)]">
                          <span>{n.chunk_count} chunks</span>
                          {n.community_id && <span>community: {n.community_id}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail Panel */}
                <div className="lg:sticky lg:top-24 lg:self-start">
                  {selectedNode ? (
                    <div className="card-dia p-6">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${NODE_TYPE_COLORS[selectedNode.type] ?? "bg-[rgba(0,0,0,0.2)]"}`} />
                        <span className="rounded-full bg-[rgba(0,0,0,0.06)] px-3 py-1 text-xs font-medium text-[rgba(0,0,0,0.6)]">{selectedNode.type}</span>
                      </div>
                      <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-light text-[rgba(0,0,0,0.85)]">{selectedNode.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[rgba(0,0,0,0.6)]">{selectedNode.description}</p>
                      <div className="mt-3 flex gap-3 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">
                        <span>{selectedNode.chunk_count} evidence chunks</span>
                        {selectedNode.community_id && <span>Community: {selectedNode.community_id}</span>}
                      </div>

                      {relatedEdges.length > 0 && (
                        <div className="mt-5 border-t border-[rgba(0,0,0,0.06)] pt-4">
                          <p className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">Relationships ({relatedEdges.length})</p>
                          <div className="space-y-2">
                            {relatedEdges.slice(0, 10).map((e, i) => {
                              const other = e.source === selectedNode.id ? e.target : e.source;
                              return (
                                <div key={i} className="rounded-2xl bg-[rgba(0,0,0,0.03)] p-3 text-xs">
                                  <span className="font-medium text-[rgba(0,0,0,0.7)]">{e.type}</span>
                                  <span className="mx-1 text-[rgba(0,0,0,0.3)]">&rarr;</span>
                                  <span className="text-[rgba(0,0,0,0.6)]">{other}</span>
                                  {e.description && <p className="mt-1 text-[rgba(0,0,0,0.4)]">{e.description}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedNode.community_id && graph.communities[selectedNode.community_id] && (
                        <div className="mt-4 rounded-2xl bg-[#0358F7]/6 p-4">
                          <p className="text-xs font-medium text-[#0358F7]">Community Summary</p>
                          <p className="mt-1 text-xs text-[#0358F7]/70">{graph.communities[selectedNode.community_id]}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card-dia p-10 text-center">
                      <p className="text-sm text-[rgba(0,0,0,0.4)]">Click an entity to see details and relationships</p>
                    </div>
                  )}

                  {Object.keys(graph.communities).length > 0 && (
                    <div className="mt-4 card-dia p-5">
                      <h3 className="font-[family-name:var(--font-display)] text-sm font-medium text-[rgba(0,0,0,0.85)]">Communities</h3>
                      <div className="mt-3 space-y-2">
                        {Object.entries(graph.communities).map(([id, summary]) => (
                          <div key={id} className="rounded-2xl bg-[rgba(0,0,0,0.03)] p-3">
                            <p className="font-[family-name:var(--font-mono)] text-xs font-medium text-[rgba(0,0,0,0.6)]">{id}</p>
                            <p className="mt-1 text-xs text-[rgba(0,0,0,0.45)]">{String(summary).slice(0, 150)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Persona Evidence */}
        {tab === "personas" && !loading && (
          <div className="animate-fade-in">
            {!dashboard ? (
              <p className="py-8 text-center text-[rgba(0,0,0,0.4)]">Run a simulation first to see persona evidence.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                <div className="space-y-2">
                  <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-light text-[rgba(0,0,0,0.85)]">Personas</h2>
                  {dashboard.personas.map((p) => (
                    <button key={p.persona_id} type="button" onClick={() => setSelectedPersona(p)}
                      className={`w-full card-dia p-3.5 text-left transition ${selectedPersona?.persona_id === p.persona_id ? "ring-2 ring-[rgba(0,0,0,0.2)]" : "hover:shadow-[var(--shadow-card-hover)]"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPersonaColor(p.persona_id)}`}>{p.segment_label}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-[rgba(0,0,0,0.5)]">{p.summary}</p>
                      <div className="mt-2 flex gap-3 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">
                        <span>Adoption: {p.adoption_likelihood}%</span>
                        <span>{Object.keys(p.feature_priorities).length} facets</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  {selectedPersona ? (
                    <div className="space-y-4">
                      <div className="card-dia p-6">
                        <h3 className="font-[family-name:var(--font-display)] text-xl font-light text-[rgba(0,0,0,0.85)]">{selectedPersona.segment_label}</h3>
                        <p className="mt-2 text-sm text-[rgba(0,0,0,0.5)]">{selectedPersona.summary}</p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-3">
                          <div className="rounded-2xl bg-emerald-50 p-4">
                            <p className="text-xs font-medium text-emerald-600">Strongest Positive</p>
                            <p className="mt-1.5 text-sm text-emerald-800">{selectedPersona.strongest_positive}</p>
                          </div>
                          <div className="rounded-2xl bg-[#FA3D1D]/8 p-4">
                            <p className="text-xs font-medium text-[#FA3D1D]">Top Concern</p>
                            <p className="mt-1.5 text-sm text-[#D42E11]">{selectedPersona.strongest_concern}</p>
                          </div>
                          <div className="rounded-2xl bg-[#0358F7]/8 p-4">
                            <p className="text-xs font-medium text-[#0358F7]">Adoption</p>
                            <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-light text-[#0358F7]">{selectedPersona.adoption_likelihood}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="card-dia p-6">
                        <h4 className="text-sm font-semibold text-[rgba(0,0,0,0.85)]">Feature Priorities</h4>
                        <div className="mt-4 space-y-3">
                          {Object.entries(selectedPersona.feature_priorities)
                            .sort(([, a], [, b]) => b - a)
                            .map(([facet, score]) => (
                              <div key={facet} className="flex items-center gap-3">
                                <span className="w-20 text-sm capitalize text-[rgba(0,0,0,0.6)]">{facet}</span>
                                <div className="h-2 flex-1 rounded-full bg-[rgba(0,0,0,0.06)]">
                                  <div className="h-2 rounded-full bg-[rgba(0,0,0,0.7)]" style={{ width: `${Math.round(score * 100)}%` }} />
                                </div>
                                <span className="w-10 text-right font-[family-name:var(--font-mono)] text-xs font-medium text-[rgba(0,0,0,0.6)]">{Math.round(score * 100)}%</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="card-dia p-6">
                        <h4 className="text-sm font-semibold text-[rgba(0,0,0,0.85)]">Cited Evidence</h4>
                        <p className="mt-1 text-xs text-[rgba(0,0,0,0.4)]">Chunks this persona referenced in their responses</p>
                        <div className="mt-3 space-y-2">
                          {(() => {
                            const r2 = dashboard.round2_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                            const r1 = dashboard.round1_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                            const allCited = new Set([...(r1?.cited_chunk_ids ?? []), ...(r2?.cited_chunk_ids ?? [])]);
                            if (allCited.size === 0) return <p className="text-xs text-[rgba(0,0,0,0.35)]">No cited evidence.</p>;
                            return Array.from(allCited).map((cid) => (
                              <div key={cid} className="rounded-2xl bg-[rgba(0,0,0,0.03)] p-3">
                                <code className="font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.45)]">{cid}</code>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {(() => {
                        const r1 = dashboard.round1_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                        const r2 = dashboard.round2_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                        if (!r1 && !r2) return null;
                        return (
                          <div className="card-dia p-6">
                            <h4 className="text-sm font-semibold text-[rgba(0,0,0,0.85)]">Simulation Responses</h4>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                              {r1 && (
                                <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] p-4">
                                  <p className="font-[family-name:var(--font-mono)] text-xs font-medium text-[rgba(0,0,0,0.4)]">Round 1</p>
                                  <p className="mt-2 text-sm text-[rgba(0,0,0,0.7)]">{r1.overall_reaction}</p>
                                  <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">Adoption: {r1.adoption_likelihood_0_100}%</p>
                                </div>
                              )}
                              {r2 && (
                                <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] p-4">
                                  <p className="font-[family-name:var(--font-mono)] text-xs font-medium text-[rgba(0,0,0,0.4)]">Round 2</p>
                                  <p className="mt-2 text-sm text-[rgba(0,0,0,0.7)]">{r2.overall_reaction}</p>
                                  <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">Adoption: {r2.adoption_likelihood_0_100}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {dashboard.quotes.filter((q) => q.persona_id === selectedPersona.persona_id).length > 0 && (
                        <div className="card-dia p-6">
                          <h4 className="text-sm font-semibold text-[rgba(0,0,0,0.85)]">Quotes</h4>
                          <div className="mt-3 space-y-2">
                            {dashboard.quotes
                              .filter((q) => q.persona_id === selectedPersona.persona_id)
                              .map((q, i) => (
                                <div key={i} className="rounded-2xl border-l-2 border-[#0358F7]/30 bg-[#0358F7]/4 p-4">
                                  <p className="text-sm italic text-[rgba(0,0,0,0.7)]">"{q.quote}"</p>
                                  <p className="mt-1.5 text-xs text-[rgba(0,0,0,0.4)] capitalize">{q.facet} &middot; {q.sentiment}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card-dia flex items-center justify-center p-16">
                      <p className="text-[rgba(0,0,0,0.4)]">Select a persona to explore their evidence and responses</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
