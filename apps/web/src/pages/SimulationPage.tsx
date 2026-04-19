import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { ProjectContext } from "../App";
import { createProject, fetchProgressLogs, pollSimulationStatus, runSimulation, startIngest } from "../lib/api";

interface SimulationPageProps {
  project: ProjectContext;
  onComplete: (projectId: string) => void;
  onError: () => void;
}

type Phase = "creating" | "ingesting" | "simulating" | "polling" | "done" | "failed";

const PHASE_ORDER: Phase[] = ["creating", "ingesting", "simulating", "polling", "done"];

const PHASE_META: Record<Phase, { label: string; color: string }> = {
  creating: { label: "Creating project", color: "#0358F7" },
  ingesting: { label: "Ingesting sources", color: "#C679C4" },
  simulating: { label: "Preparing simulation", color: "#FFB005" },
  polling: { label: "Focus group in session", color: "#FA3D1D" },
  done: { label: "Complete", color: "#22c55e" },
  failed: { label: "Failed", color: "#FA3D1D" },
};

const FACET_COLORS = ["#0358F7", "#FFB005", "#FA3D1D", "#C679C4", "#5092C7", "#22c55e", "#f97316", "#8b5cf6"];

function buildPersonas(facets: string[]) {
  return facets.map((facet, i) => {
    const words = facet.trim().split(/\s+/);
    const initials = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : facet.slice(0, 2).toUpperCase();
    return {
      name: facet.charAt(0).toUpperCase() + facet.slice(1),
      initials,
      color: FACET_COLORS[i % FACET_COLORS.length],
    };
  });
}

export function SimulationPage({ project, onComplete, onError }: SimulationPageProps) {
  const [phase, setPhase] = useState<Phase>("creating");
  const [simPhase, setSimPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [visiblePersonas, setVisiblePersonas] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState(-1);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logCountRef = useRef(0);
  const ranRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const talkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const personas = buildPersonas(project.facets.length > 0 ? project.facets : [project.productName]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (logPollRef.current) { clearInterval(logPollRef.current); logPollRef.current = null; }
    if (talkRef.current) { clearInterval(talkRef.current); talkRef.current = null; }
    if (revealRef.current) { clearTimeout(revealRef.current); revealRef.current = null; }
  }, []);

  const startLogPolling = useCallback((pid: string) => {
    logCountRef.current = 0;
    logPollRef.current = setInterval(async () => {
      try {
        const res = await fetchProgressLogs(pid, logCountRef.current);
        const newMsgs = res.data.messages;
        if (newMsgs.length > 0) {
          logCountRef.current += newMsgs.length;
          setLogs(prev => [...prev, ...newMsgs]);
        }
      } catch {}
    }, 1200);
  }, []);

  // Card entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(containerRef.current, { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, []);

  // Persona reveal + speaking cycle during simulation
  useEffect(() => {
    if (phase !== "polling" && phase !== "simulating") {
      setVisiblePersonas(0);
      setActiveSpeaker(-1);
      return;
    }

    let count = 0;
    const reveal = () => {
      if (count < personas.length) {
        count++;
        setVisiblePersonas(count);
        revealRef.current = setTimeout(reveal, 350);
      }
    };
    revealRef.current = setTimeout(reveal, 200);

    const startSpeaking = setTimeout(() => {
      let speakerIdx = 0;
      talkRef.current = setInterval(() => {
        setActiveSpeaker(speakerIdx % personas.length);
        speakerIdx++;
        setTimeout(() => setActiveSpeaker(-1), 2200);
      }, 3000);
    }, personas.length * 350 + 500);

    return () => {
      clearTimeout(startSpeaking);
      if (talkRef.current) clearInterval(talkRef.current);
      if (revealRef.current) clearTimeout(revealRef.current);
    };
  }, [phase, personas.length]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // Main pipeline
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        setPhase("creating");
        const createResult = await createProject(project.productName, project.seedUrls, project.hypotheses);
        const pid = createResult.data.project_id;

        setPhase("ingesting");
        startLogPolling(pid);
        const sources = project.seedUrls.length > 0 ? project.seedUrls : [];
        const ingestResult = await startIngest(pid, sources, project.productName);

        if (ingestResult.data.chunk_count === 0) {
          throw new Error("No content found for this product. Try adding seed URLs.");
        }

        setPhase("simulating");
        await runSimulation(pid, project.productName, project.description, project.hypotheses, project.facets);

        setPhase("polling");
        pollRef.current = setInterval(async () => {
          const status = await pollSimulationStatus(pid);
          const s = status.data;
          setSimPhase(s.phase);
          if (s.done) {
            stopPolling();
            if (s.phase === "DONE" || !s.error) {
              setPhase("done");
              setTimeout(() => onComplete(pid), 1200);
            } else {
              setPhase("failed");
              setError(s.error);
            }
          }
        }, 1500);
      } catch (err) {
        setPhase("failed");
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();

    return stopPolling;
  }, [project, onComplete, stopPolling, startLogPolling]);

  const currentIdx = PHASE_ORDER.indexOf(phase === "failed" ? "polling" : phase);
  const isSessionActive = phase === "polling" || phase === "simulating";
  const activePersona = activeSpeaker >= 0 ? personas[activeSpeaker] : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ background: "#F8F8F8" }}>
      <div ref={containerRef} className="w-full max-w-xl">
        <div className="card-dia overflow-hidden">
          {/* Colored top bar showing current phase */}
          <div className="h-1 transition-colors duration-700" style={{ backgroundColor: PHASE_META[phase].color }} />

          <div className="p-7 sm:p-9">
            {/* Header */}
            <div className="text-center">
              <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(0,0,0,0.35)]">
                PanelForge
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
                {project.productName}
              </h2>
            </div>

            {/* Progress steps */}
            <div className="mt-7 flex items-center justify-center gap-2">
              {PHASE_ORDER.slice(0, 4).map((p, i) => {
                const done = i < currentIdx || phase === "done";
                const active = i === currentIdx && phase !== "done" && phase !== "failed";
                const failed = phase === "failed" && i === currentIdx;
                const meta = PHASE_META[p];
                return (
                  <div key={p} className="flex items-center gap-2">
                    {i > 0 && (
                      <div className={`h-px w-4 sm:w-8 transition-colors duration-500 ${done ? "bg-emerald-300" : "bg-[rgba(0,0,0,0.08)]"}`} />
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500 ${
                          failed ? "bg-[#FA3D1D]/12 text-[#FA3D1D]"
                          : done ? "bg-emerald-50 text-emerald-600"
                          : active ? "text-white"
                          : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.2)]"
                        }`}
                        style={active ? { backgroundColor: meta.color, boxShadow: `0 0 16px ${meta.color}35` } : undefined}
                      >
                        {done ? "\u2713" : failed ? "!" : active ? (
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        ) : i + 1}
                      </div>
                      <span className={`hidden text-[9px] sm:block ${active ? "font-medium text-[rgba(0,0,0,0.6)]" : "text-[rgba(0,0,0,0.25)]"}`}>
                        {meta.label.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active status label */}
            <p className="mt-5 text-center text-sm text-[rgba(0,0,0,0.5)]">
              {PHASE_META[phase].label}
              {simPhase && phase === "polling" && <span className="text-[rgba(0,0,0,0.3)]"> — {simPhase}</span>}
            </p>

            {/* ── Focus Group Visualization ── */}
            {isSessionActive && (
              <div className="mt-8">
                {/* Persona circles */}
                <div className="flex flex-wrap items-end justify-center gap-4">
                  {personas.map((p, i) => {
                    const visible = i < visiblePersonas;
                    const speaking = activeSpeaker === i;
                    return (
                      <div
                        key={p.initials}
                        className="flex flex-col items-center gap-1.5 transition-all duration-500"
                        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
                      >
                        <div className="relative">
                          {/* Pulse ring when speaking */}
                          {speaking && (
                            <div className="absolute -inset-1.5 animate-ping rounded-full opacity-20" style={{ backgroundColor: p.color }} />
                          )}
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full font-[family-name:var(--font-mono)] text-[10px] font-bold text-white transition-shadow duration-300"
                            style={{
                              backgroundColor: p.color,
                              boxShadow: speaking ? `0 0 24px ${p.color}50` : `0 2px 8px ${p.color}20`,
                              transform: speaking ? "scale(1.15)" : "scale(1)",
                              transition: "transform 0.3s, box-shadow 0.3s",
                            }}
                          >
                            {p.initials}
                          </div>
                        </div>
                        <span className={`text-[9px] font-medium transition-colors duration-300 ${speaking ? "text-[rgba(0,0,0,0.7)]" : "text-[rgba(0,0,0,0.3)]"}`}>
                          {p.name.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Active speaker indicator */}
                <div className="mt-6 min-h-[52px]">
                  {activePersona && (
                    <div
                      key={activeSpeaker}
                      className="animate-fade-in rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                          style={{ backgroundColor: activePersona.color }}
                        >
                          {activePersona.initials}
                        </div>
                        <p className="text-[12px] font-medium" style={{ color: activePersona.color }}>
                          Discussing {activePersona.name.toLowerCase()}…
                        </p>
                      </div>
                    </div>
                  )}
                  {!activePersona && visiblePersonas >= personas.length && (
                    <div className="flex items-center justify-center gap-1.5 py-4">
                      <div className="h-1 w-1 animate-bounce rounded-full bg-[rgba(0,0,0,0.15)]" style={{ animationDelay: "0ms" }} />
                      <div className="h-1 w-1 animate-bounce rounded-full bg-[rgba(0,0,0,0.15)]" style={{ animationDelay: "150ms" }} />
                      <div className="h-1 w-1 animate-bounce rounded-full bg-[rgba(0,0,0,0.15)]" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Log stream */}
            {logs.length > 0 && (
              <div className="mt-5 max-h-28 overflow-y-auto rounded-xl bg-[rgba(0,0,0,0.03)] px-4 py-3">
                {logs.map((msg, i) => (
                  <div key={`log-${i}`} className="flex gap-2 py-[2px] animate-fade-in">
                    <span className="shrink-0 select-none text-[11px] text-[rgba(0,0,0,0.15)]">&rsaquo;</span>
                    <span className="text-[11px] leading-relaxed text-[rgba(0,0,0,0.4)]">{msg}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}

            {/* Done */}
            {phase === "done" && (
              <div className="mt-6 animate-fade-in rounded-2xl bg-emerald-50 p-4 text-center">
                <p className="text-sm font-medium text-emerald-700">Analysis complete — loading dashboard</p>
              </div>
            )}

            {/* Failed */}
            {phase === "failed" && (
              <div className="mt-6 animate-fade-in space-y-3">
                <div className="rounded-2xl bg-[#FA3D1D]/8 p-4 text-sm text-[#D42E11]">
                  {error ?? "An unknown error occurred."}
                </div>
                <button type="button" onClick={onError} className="btn-secondary w-full">Start Over</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
