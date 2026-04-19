import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods, NodeObject } from "react-force-graph-2d";

interface GraphNode {
  id: string;
  title: string;
  type: string;
  description: string;
  community?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

interface Community {
  id: string;
  title: string;
  summary: string;
  entity_ids: string[];
}

interface GraphApiResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: Record<string, Community>;
}

interface TopicGraphProps {
  projectId: string | null;
}

// Obsidian-style palette: muted jewel tones that read well on a dark canvas
const COMMUNITY_PALETTE = [
  "#7f6df2", // violet
  "#00d2c6", // teal
  "#ff7eb3", // rose
  "#ffc857", // amber
  "#5cc9f5", // sky
  "#ff6b6b", // coral
  "#a3e635", // lime
  "#f97316", // orange
  "#c084fc", // purple
  "#34d399", // emerald
  "#fb923c", // tangerine
  "#60a5fa", // blue
  "#e879f9", // fuchsia
  "#facc15", // yellow
];

const GRAPH_BG = "#1a1a2e";
const LINK_COLOR_DEFAULT = "rgba(0, 255, 200, 0.12)";
const LINK_COLOR_HIGHLIGHT = "rgba(0, 255, 200, 0.6)";
const LINK_COLOR_DIM = "rgba(0, 255, 200, 0.04)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.85)";
const LABEL_COLOR_DIM = "rgba(255, 255, 255, 0.15)";
const NODE_DIM_ALPHA = 0.12;

function getCommunityColor(
  communityId: string | undefined,
  communityIndex: Map<string, number>,
): string {
  if (!communityId) return "rgba(255,255,255,0.35)";
  const idx = communityIndex.get(communityId);
  if (idx === undefined) return "rgba(255,255,255,0.35)";
  return COMMUNITY_PALETTE[idx % COMMUNITY_PALETTE.length];
}

/**
 * Lazy-load the ForceGraph2D component to avoid SSR issues
 * and reduce bundle size when the graph tab is not active.
 */
function useLazyForceGraph() {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    import("react-force-graph-2d").then((mod) => {
      if (!cancelled) {
        setComponent(() => mod.default);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return Component;
}

interface ForceNode extends GraphNode {
  connections: number;
  color: string;
  x?: number;
  y?: number;
}

interface ForceLink {
  source: string;
  target: string;
  type: string;
  weight: number;
}

export function TopicGraph({ projectId }: TopicGraphProps) {
  const [data, setData] = useState<GraphApiResponse | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);

  const ForceGraph2D = useLazyForceGraph();

  // Fetch graph data
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/graph`)
      .then((r) => r.json())
      .then((result: GraphApiResponse) => setData(result))
      .catch(() => setData(null));
  }, [projectId]);

  // Track container width for responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build community index map (community id -> palette index) dynamically
  const communityIndex = useMemo(() => {
    if (!data) return new Map<string, number>();
    const ids = Object.keys(data.communities);
    return new Map(ids.map((id, i) => [id, i]));
  }, [data]);

  // Build adjacency for fast neighbor lookup
  const adjacency = useMemo(() => {
    if (!data) return new Map<string, Set<string>>();
    const map = new Map<string, Set<string>>();
    for (const edge of data.edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    }
    return map;
  }, [data]);

  // Connection counts per node
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [nodeId, neighbors] of adjacency) {
      counts.set(nodeId, neighbors.size);
    }
    return counts;
  }, [adjacency]);

  // Build force-graph data
  const graphData = useMemo(() => {
    if (!data) return { nodes: [] as ForceNode[], links: [] as ForceLink[] };

    const nodes: ForceNode[] = data.nodes.map((n) => ({
      ...n,
      connections: connectionCounts.get(n.id) ?? 0,
      color: getCommunityColor(n.community, communityIndex),
    }));

    const links: ForceLink[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight,
    }));

    return { nodes, links };
  }, [data, communityIndex, connectionCounts]);

  // The active highlight target: hovered takes precedence over selected
  const activeNodeId = hoveredNodeId ?? selectedNodeId;

  // Set of highlighted node ids (active node + its neighbors)
  const highlightedNodeIds = useMemo(() => {
    if (!activeNodeId) return null;
    const set = new Set<string>([activeNodeId]);
    const neighbors = adjacency.get(activeNodeId);
    if (neighbors) {
      for (const n of neighbors) set.add(n);
    }
    return set;
  }, [activeNodeId, adjacency]);

  // Set of highlighted links
  const highlightedLinks = useMemo(() => {
    if (!activeNodeId || !data) return null;
    const set = new Set<string>();
    for (const edge of data.edges) {
      if (edge.source === activeNodeId || edge.target === activeNodeId) {
        set.add(`${edge.source}__${edge.target}`);
      }
    }
    return set;
  }, [activeNodeId, data]);

  // Detail panel data
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !data) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, data]);

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId || !data) return [];
    const neighbors = adjacency.get(selectedNodeId);
    if (!neighbors) return [];
    return data.nodes.filter(
      (n) => neighbors.has(n.id) && n.id !== selectedNodeId,
    );
  }, [selectedNodeId, data, adjacency]);

  // Canvas custom render: draw circle + label
  const nodeCanvasObject = useCallback(
    (
      node: NodeObject<ForceNode>,
      ctx: CanvasRenderingContext2D,
      globalScale: number,
    ) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const connections = (node as ForceNode).connections ?? 0;
      const baseRadius = 3 + Math.sqrt(connections) * 2;
      const radius = baseRadius;
      const color = (node as ForceNode).color ?? "rgba(255,255,255,0.35)";
      const nodeId = node.id as string;

      const isHighlightActive = highlightedNodeIds !== null;
      const isHighlighted = highlightedNodeIds?.has(nodeId) ?? false;
      const isActive = nodeId === activeNodeId;

      // Determine alpha
      let alpha = 1;
      if (isHighlightActive && !isHighlighted) {
        alpha = NODE_DIM_ALPHA;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // Glow for active node
      if (isActive) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
      }

      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Ring for active node
      if (isActive) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Label
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle =
        isHighlightActive && !isHighlighted ? LABEL_COLOR_DIM : LABEL_COLOR;
      ctx.fillText(
        (node as ForceNode).title ?? "",
        x,
        y + radius + 2,
      );

      ctx.restore();
    },
    [highlightedNodeIds, activeNodeId],
  );

  // Pointer area for hit detection
  const nodePointerAreaPaint = useCallback(
    (
      node: NodeObject<ForceNode>,
      paintColor: string,
      ctx: CanvasRenderingContext2D,
    ) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const connections = (node as ForceNode).connections ?? 0;
      const radius = 3 + Math.sqrt(connections) * 2 + 4; // slightly larger for easier clicking
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = paintColor;
      ctx.fill();
    },
    [],
  );

  // Link color
  const linkColor = useCallback(
    (link: ForceLink) => {
      if (!highlightedLinks) return LINK_COLOR_DEFAULT;
      const src =
        typeof link.source === "object"
          ? (link.source as ForceNode).id
          : link.source;
      const tgt =
        typeof link.target === "object"
          ? (link.target as ForceNode).id
          : link.target;
      const key = `${src}__${tgt}`;
      const keyRev = `${tgt}__${src}`;
      if (highlightedLinks.has(key) || highlightedLinks.has(keyRev)) {
        return LINK_COLOR_HIGHLIGHT;
      }
      return LINK_COLOR_DIM;
    },
    [highlightedLinks],
  );

  const linkWidth = useCallback(
    (link: ForceLink) => {
      if (!highlightedLinks) return 0.5;
      const src =
        typeof link.source === "object"
          ? (link.source as ForceNode).id
          : link.source;
      const tgt =
        typeof link.target === "object"
          ? (link.target as ForceNode).id
          : link.target;
      const key = `${src}__${tgt}`;
      const keyRev = `${tgt}__${src}`;
      if (highlightedLinks.has(key) || highlightedLinks.has(keyRev)) {
        return 1.5;
      }
      return 0.3;
    },
    [highlightedLinks],
  );

  const handleNodeClick = useCallback(
    (node: NodeObject<ForceNode>) => {
      const nodeId = node.id as string;
      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    },
    [],
  );

  const handleNodeHover = useCallback(
    (node: NodeObject<ForceNode> | null) => {
      setHoveredNodeId(node ? (node.id as string) : null);
    },
    [],
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Zoom to fit on initial data load
  useEffect(() => {
    if (graphData.nodes.length > 0 && graphRef.current) {
      const timer = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 40);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphData.nodes.length]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="card-dia p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
          Topic Graph
        </h2>
        <p className="mt-3 text-sm text-[rgba(0,0,0,0.4)]">
          No graph data available for this project.
        </p>
      </div>
    );
  }

  const communities = Object.values(data.communities);

  return (
    <div className="card-dia overflow-hidden p-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
          Topic Graph
        </h2>
        <p className="mt-1 text-sm text-[rgba(0,0,0,0.45)]">
          {data.nodes.length} entities across {communities.length} topic
          clusters
        </p>
      </div>

      {/* Community legend */}
      <div className="flex flex-wrap gap-3 px-6 pb-3">
        {communities.map((comm) => {
          const color = getCommunityColor(comm.id, communityIndex);
          return (
            <div key={comm.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-wider text-[rgba(0,0,0,0.45)]">
                {comm.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Graph canvas + detail panel overlay */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: 500, background: GRAPH_BG }}
      >
        {ForceGraph2D && (
          <ForceGraph2D
            ref={graphRef as any}
            graphData={graphData}
            width={containerWidth}
            height={500}
            backgroundColor={GRAPH_BG}
            nodeCanvasObjectMode={() => "replace"}
            nodeCanvasObject={nodeCanvasObject as any}
            nodePointerAreaPaint={nodePointerAreaPaint as any}
            linkColor={linkColor as any}
            linkWidth={linkWidth as any}
            linkSource="source"
            linkTarget="target"
            onNodeClick={handleNodeClick as any}
            onNodeHover={handleNodeHover as any}
            onBackgroundClick={handleBackgroundClick}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            nodeVal={(node: any) =>
              1 + ((node as ForceNode).connections ?? 0)
            }
          />
        )}

        {/* Selected node detail panel — overlay on the right */}
        {selectedNode && (
          <div
            className="absolute top-3 right-3 z-10 w-72 rounded-xl border border-[rgba(255,255,255,0.08)] p-4 shadow-2xl backdrop-blur-md"
            style={{ background: "rgba(20, 20, 40, 0.92)" }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1 pr-2">
                <p className="font-[family-name:var(--font-display)] text-sm font-medium capitalize text-white">
                  {selectedNode.title}
                </p>
                <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                  {selectedNode.type}
                  {selectedNode.community && (
                    <>
                      {" "}
                      <span
                        className="ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                        style={{
                          backgroundColor: getCommunityColor(
                            selectedNode.community,
                            communityIndex,
                          ),
                        }}
                      />{" "}
                      {data.communities[selectedNode.community]?.title ??
                        selectedNode.community}
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[rgba(255,255,255,0.4)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
                aria-label="Close detail panel"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>

            <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.6)]">
              {selectedNode.description}
            </p>

            {connectedNodes.length > 0 && (
              <div className="mt-3 border-t border-[rgba(255,255,255,0.08)] pt-3">
                <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
                  Connected to
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {connectedNodes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNodeId(n.id)}
                      className="rounded-full px-2.5 py-0.5 text-[11px] capitalize transition hover:brightness-125"
                      style={{
                        backgroundColor: `${getCommunityColor(n.community, communityIndex)}22`,
                        color: getCommunityColor(n.community, communityIndex),
                      }}
                    >
                      {n.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
