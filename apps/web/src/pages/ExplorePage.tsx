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
  camera: "bg-blue-100 text-blue-700",
  battery: "bg-green-100 text-green-700",
  price: "bg-amber-100 text-amber-700",
  design: "bg-purple-100 text-purple-700",
  privacy: "bg-red-100 text-red-700",
  ecosystem: "bg-cyan-100 text-cyan-700",
  other: "bg-gray-100 text-gray-600",
  web_article: "bg-gray-100 text-gray-600",
  reddit_post: "bg-orange-100 text-orange-700",
  youtube: "bg-rose-100 text-rose-700",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  Product: "bg-blue-500",
  Feature: "bg-green-500",
  Concern: "bg-red-500",
  Competitor: "bg-amber-500",
  Segment: "bg-purple-500",
  Claim: "bg-cyan-500",
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">PanelForge</span>
            <h1 className="mt-1 text-lg font-semibold text-gray-900">Data Explorer — {productName || "Project"}</h1>
          </div>
          <button type="button" onClick={onBack} className="btn-secondary text-sm">Back to Dashboard</button>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-6">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`border-b-2 pb-3 pt-1 text-sm font-medium transition ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label} {t.count ? <span className="ml-1 text-xs text-gray-400">({t.count})</span> : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading && <div className="py-12 text-center text-gray-400">Loading...</div>}

        {/* Documents */}
        {tab === "documents" && !loading && (
          <div className="animate-fade-in space-y-3">
            {docs.length === 0 && <p className="py-8 text-center text-gray-400">No documents ingested yet.</p>}
            {docs.map((d) => (
              <div key={d.filename} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-gray-900">{d.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${FACET_COLORS[d.source_type] ?? FACET_COLORS.other}`}>
                        {d.source_type}
                      </span>
                    </div>
                    {d.source_url && <p className="mt-1 truncate text-xs text-gray-400">{d.source_url}</p>}
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-3">{d.preview}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{(d.size_bytes / 1024).toFixed(1)}KB</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chunks */}
        {tab === "chunks" && !loading && (
          <div className="animate-fade-in">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Filter:</span>
              {["", "camera", "battery", "price", "design", "privacy", "ecosystem", "web_article", "reddit_post", "youtube"].map((f) => (
                <button key={f} type="button" onClick={() => setFacetFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${facetFilter === f ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                  {f || "All"}
                </button>
              ))}
            </div>
            <p className="mb-3 text-xs text-gray-400">{chunkTotal} chunks total, showing {chunks.length}</p>
            <div className="space-y-2">
              {chunks.map((c) => (
                <div key={c.chunk_id} className="rounded-lg border border-gray-100 bg-white p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{c.chunk_id.slice(0, 12)}</code>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FACET_COLORS[c.facet] ?? FACET_COLORS.other}`}>{c.facet}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${c.stance === "positive" ? "border-green-200 text-green-600" : c.stance === "negative" ? "border-red-200 text-red-600" : "border-gray-200 text-gray-500"}`}>{c.stance}</span>
                    {c.evidence_score > 0 && <span className="text-xs text-gray-400">score: {(c.evidence_score * 100).toFixed(0)}%</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">{c.text}</p>
                  {c.claims.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.claims.map((cl, i) => (
                        <span key={i} className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-500">{cl}</span>
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
              <p className="py-8 text-center text-gray-400">No graph data available. Run ingestion with graph extraction first.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                {/* Node Grid */}
                <div>
                  <div className="mb-4 flex items-center gap-4">
                    <h2 className="font-semibold text-gray-900">Entities ({graph.nodes.length})</h2>
                    <div className="flex gap-2">
                      {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => (
                        <span key={type} className="flex items-center gap-1 text-xs text-gray-500">
                          <span className={`h-2 w-2 rounded-full ${color}`} /> {type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {graph.nodes.map((n) => (
                      <button key={n.id} type="button" onClick={() => setSelectedNode(n)}
                        className={`rounded-lg border p-3 text-left transition ${selectedNode?.id === n.id ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${NODE_TYPE_COLORS[n.type] ?? "bg-gray-400"}`} />
                          <span className="truncate text-sm font-medium text-gray-800">{n.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400 line-clamp-2">{n.description}</p>
                        <div className="mt-1.5 flex gap-2 text-xs text-gray-400">
                          <span>{n.chunk_count} chunks</span>
                          {n.community_id && <span>community: {n.community_id}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail Panel */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                  {selectedNode ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${NODE_TYPE_COLORS[selectedNode.type] ?? "bg-gray-400"}`} />
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{selectedNode.type}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-gray-900">{selectedNode.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{selectedNode.description}</p>
                      <div className="mt-3 flex gap-3 text-xs text-gray-400">
                        <span>{selectedNode.chunk_count} evidence chunks</span>
                        {selectedNode.community_id && <span>Community: {selectedNode.community_id}</span>}
                      </div>

                      {relatedEdges.length > 0 && (
                        <div className="mt-5 border-t border-gray-100 pt-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Relationships ({relatedEdges.length})</p>
                          <div className="space-y-2">
                            {relatedEdges.slice(0, 10).map((e, i) => {
                              const other = e.source === selectedNode.id ? e.target : e.source;
                              return (
                                <div key={i} className="rounded-lg bg-gray-50 p-2.5 text-xs">
                                  <span className="font-medium text-gray-700">{e.type}</span>
                                  <span className="mx-1 text-gray-400">&rarr;</span>
                                  <span className="text-gray-600">{other}</span>
                                  {e.description && <p className="mt-1 text-gray-400">{e.description}</p>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedNode.community_id && graph.communities[selectedNode.community_id] && (
                        <div className="mt-4 rounded-lg bg-blue-50 p-3">
                          <p className="text-xs font-medium text-blue-700">Community Summary</p>
                          <p className="mt-1 text-xs text-blue-600">{graph.communities[selectedNode.community_id]}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                      <p className="text-sm text-gray-400">Click an entity to see details and relationships</p>
                    </div>
                  )}

                  {/* Community List */}
                  {Object.keys(graph.communities).length > 0 && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900">Communities</h3>
                      <div className="mt-3 space-y-2">
                        {Object.entries(graph.communities).map(([id, summary]) => (
                          <div key={id} className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs font-medium text-gray-700">{id}</p>
                            <p className="mt-1 text-xs text-gray-500">{String(summary).slice(0, 150)}</p>
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
              <p className="py-8 text-center text-gray-400">Run a simulation first to see persona evidence.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                {/* Persona List */}
                <div className="space-y-2">
                  <h2 className="mb-3 font-semibold text-gray-900">Personas</h2>
                  {dashboard.personas.map((p) => (
                    <button key={p.persona_id} type="button" onClick={() => setSelectedPersona(p)}
                      className={`w-full rounded-lg border p-3 text-left transition ${selectedPersona?.persona_id === p.persona_id ? "border-blue-300 bg-blue-50" : "border-gray-100 hover:border-gray-200"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPersonaColor(p.persona_id)}`}>{p.segment_label}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{p.summary}</p>
                      <div className="mt-2 flex gap-3 text-xs text-gray-400">
                        <span>Adoption: {p.adoption_likelihood}%</span>
                        <span>{Object.keys(p.feature_priorities).length} facets</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Persona Detail */}
                <div>
                  {selectedPersona ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900">{selectedPersona.segment_label}</h3>
                        <p className="mt-1 text-sm text-gray-500">{selectedPersona.summary}</p>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-xs font-medium text-green-600">Strongest Positive</p>
                            <p className="mt-1 text-sm text-green-800">{selectedPersona.strongest_positive}</p>
                          </div>
                          <div className="rounded-lg bg-red-50 p-3">
                            <p className="text-xs font-medium text-red-600">Top Concern</p>
                            <p className="mt-1 text-sm text-red-800">{selectedPersona.strongest_concern}</p>
                          </div>
                          <div className="rounded-lg bg-blue-50 p-3">
                            <p className="text-xs font-medium text-blue-600">Adoption</p>
                            <p className="mt-1 text-2xl font-bold text-blue-800">{selectedPersona.adoption_likelihood}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Feature Priorities */}
                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900">Feature Priorities</h4>
                        <div className="mt-3 space-y-2">
                          {Object.entries(selectedPersona.feature_priorities)
                            .sort(([, a], [, b]) => b - a)
                            .map(([facet, score]) => (
                              <div key={facet} className="flex items-center gap-3">
                                <span className="w-20 text-sm capitalize text-gray-600">{facet}</span>
                                <div className="h-2 flex-1 rounded-full bg-gray-100">
                                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.round(score * 100)}%` }} />
                                </div>
                                <span className="w-10 text-right text-xs font-medium text-gray-700">{Math.round(score * 100)}%</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Cited Evidence from Responses */}
                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900">Cited Evidence</h4>
                        <p className="mt-1 text-xs text-gray-400">Chunks this persona referenced in their responses</p>
                        <div className="mt-3 space-y-2">
                          {(() => {
                            const r2 = dashboard.round2_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                            const r1 = dashboard.round1_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                            const allCited = new Set([...(r1?.cited_chunk_ids ?? []), ...(r2?.cited_chunk_ids ?? [])]);
                            if (allCited.size === 0) return <p className="text-xs text-gray-400">No cited evidence.</p>;
                            return Array.from(allCited).map((cid) => (
                              <div key={cid} className="rounded-lg bg-gray-50 p-3">
                                <code className="text-xs text-gray-500">{cid}</code>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Round Reactions */}
                      {(() => {
                        const r1 = dashboard.round1_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                        const r2 = dashboard.round2_responses.find((r) => r.persona_id === selectedPersona.persona_id);
                        if (!r1 && !r2) return null;
                        return (
                          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-900">Simulation Responses</h4>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                              {r1 && (
                                <div className="rounded-lg border border-gray-100 p-4">
                                  <p className="text-xs font-medium text-gray-400">Round 1</p>
                                  <p className="mt-2 text-sm text-gray-700">{r1.overall_reaction}</p>
                                  <p className="mt-2 text-xs text-gray-400">Adoption: {r1.adoption_likelihood_0_100}%</p>
                                </div>
                              )}
                              {r2 && (
                                <div className="rounded-lg border border-gray-100 p-4">
                                  <p className="text-xs font-medium text-gray-400">Round 2</p>
                                  <p className="mt-2 text-sm text-gray-700">{r2.overall_reaction}</p>
                                  <p className="mt-2 text-xs text-gray-400">Adoption: {r2.adoption_likelihood_0_100}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Quotes */}
                      {dashboard.quotes.filter((q) => q.persona_id === selectedPersona.persona_id).length > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-gray-900">Quotes</h4>
                          <div className="mt-3 space-y-2">
                            {dashboard.quotes
                              .filter((q) => q.persona_id === selectedPersona.persona_id)
                              .map((q, i) => (
                                <div key={i} className="rounded-lg border-l-2 border-blue-300 bg-blue-50/50 p-3">
                                  <p className="text-sm italic text-gray-700">"{q.quote}"</p>
                                  <p className="mt-1 text-xs text-gray-400 capitalize">{q.facet} &middot; {q.sentiment}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
                      <p className="text-gray-400">Select a persona to explore their evidence and responses</p>
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
