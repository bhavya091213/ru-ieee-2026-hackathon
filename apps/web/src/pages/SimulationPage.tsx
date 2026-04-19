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

const PHASE_LABELS: Record<Phase, string> = {
  creating: "Creating project",
  ingesting: "Fetching & analyzing sources (this may take a few minutes)",
  simulating: "Starting simulation",
  polling: "Running simulation",
  done: "Complete",
  failed: "Failed",
};

const PHASE_ORDER: Phase[] = ["creating", "ingesting", "simulating", "polling", "done"];

function CosmicBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      // Planets: gentle floating
      container.querySelectorAll<HTMLElement>("[data-planet]").forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "20");
        const range = parseFloat(el.dataset.range || "25");
        gsap.to(el, {
          y: `+=${range}`,
          duration: speed,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
        gsap.to(el, {
          x: `+=${range * 0.4}`,
          duration: speed * 1.3,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      // Orbit rings: slow rotation
      container.querySelectorAll<HTMLElement>("[data-orbit]").forEach((el) => {
        const dur = parseFloat(el.dataset.dur || "60");
        const dir = el.dataset.dir === "ccw" ? -360 : 360;
        gsap.to(el, {
          rotation: dir,
          duration: dur,
          ease: "none",
          repeat: -1,
          transformOrigin: "50% 50%",
        });
      });

      // Stars: twinkle
      container.querySelectorAll<HTMLElement>("[data-star]").forEach((el, i) => {
        gsap.to(el, {
          opacity: 0.15,
          duration: 1.5 + (i % 3) * 0.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.3,
        });
      });

      // Comet: streak across
      const comet = container.querySelector<HTMLElement>("[data-comet]");
      if (comet) {
        const animateComet = () => {
          const startY = Math.random() * 60 + 10;
          gsap.set(comet, { x: "-100px", y: `${startY}%`, opacity: 0 });
          gsap.to(comet, {
            x: "calc(100vw + 100px)",
            y: `${startY + 15}%`,
            opacity: 1,
            duration: 3,
            ease: "power1.in",
            onComplete: () => {
              gsap.to(comet, {
                opacity: 0, duration: 0.3, onComplete: () => {
                  gsap.delayedCall(8 + Math.random() * 12, animateComet);
                }
              });
            },
          });
        };
        gsap.delayedCall(3, animateComet);
      }
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Large orbit rings */}
      <div
        data-orbit
        data-dur="80"
        className="absolute rounded-full border border-dashed"
        style={{
          width: 500,
          height: 500,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderColor: "rgba(3, 88, 247, 0.1)",
        }}
      />
      <div
        data-orbit
        data-dur="60"
        data-dir="ccw"
        className="absolute rounded-full border border-dashed"
        style={{
          width: 700,
          height: 700,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderColor: "rgba(198, 121, 196, 0.08)",
        }}
      />
      <div
        data-orbit
        data-dur="100"
        className="absolute rounded-full border"
        style={{
          width: 900,
          height: 900,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderColor: "rgba(255, 176, 5, 0.06)",
          borderStyle: "dotted",
        }}
      />

      {/* Planet 1 — large blue */}
      <div
        data-planet
        data-speed="18"
        data-range="30"
        className="absolute"
        style={{ left: "8%", top: "18%" }}
      >
        <div
          className="rounded-full"
          style={{
            width: 60,
            height: 60,
            background: "radial-gradient(circle at 35% 35%, #5092C7, #0358F7 60%, #023494)",
            boxShadow: "0 0 40px rgba(3, 88, 247, 0.3), 0 0 80px rgba(3, 88, 247, 0.1)",
          }}
        />
      </div>

      {/* Planet 2 — medium pink/orchid */}
      <div
        data-planet
        data-speed="22"
        data-range="20"
        className="absolute"
        style={{ right: "12%", top: "12%" }}
      >
        <div
          className="rounded-full"
          style={{
            width: 40,
            height: 40,
            background: "radial-gradient(circle at 35% 35%, #e8a5e6, #C679C4 60%, #8a4589)",
            boxShadow: "0 0 30px rgba(198, 121, 196, 0.35), 0 0 60px rgba(198, 121, 196, 0.1)",
          }}
        />
      </div>

      {/* Planet 3 — small gold */}
      <div
        data-planet
        data-speed="15"
        data-range="35"
        className="absolute"
        style={{ left: "18%", bottom: "20%" }}
      >
        <div
          className="rounded-full"
          style={{
            width: 28,
            height: 28,
            background: "radial-gradient(circle at 35% 35%, #FFD666, #FFB005 60%, #CC8A00)",
            boxShadow: "0 0 25px rgba(255, 176, 5, 0.4), 0 0 50px rgba(255, 176, 5, 0.15)",
          }}
        />
      </div>

      {/* Planet 4 — medium red */}
      <div
        data-planet
        data-speed="25"
        data-range="22"
        className="absolute"
        style={{ right: "8%", bottom: "25%" }}
      >
        <div
          className="rounded-full"
          style={{
            width: 36,
            height: 36,
            background: "radial-gradient(circle at 35% 35%, #FF7B66, #FA3D1D 60%, #B82A11)",
            boxShadow: "0 0 30px rgba(250, 61, 29, 0.3), 0 0 60px rgba(250, 61, 29, 0.1)",
          }}
        />
      </div>

      {/* Planet 5 — tiny steel with ring */}
      <div
        data-planet
        data-speed="20"
        data-range="18"
        className="absolute"
        style={{ right: "30%", top: "8%" }}
      >
        <div className="relative">
          <div
            className="rounded-full"
            style={{
              width: 20,
              height: 20,
              background: "radial-gradient(circle at 35% 35%, #8BBAE0, #5092C7 60%, #2D6A9F)",
              boxShadow: "0 0 20px rgba(80, 146, 199, 0.35)",
            }}
          />
          {/* Saturn-like ring */}
          <div
            className="absolute rounded-full border"
            style={{
              width: 36,
              height: 12,
              left: -8,
              top: 6,
              borderColor: "rgba(80, 146, 199, 0.3)",
              transform: "rotateX(60deg)",
            }}
          />
        </div>
      </div>

      {/* Twinkling stars */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={`star-${i}`}
          data-star
          className="absolute rounded-full bg-current"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${5 + ((i * 4.7 + 13) % 90)}%`,
            top: `${3 + ((i * 7.3 + 8) % 94)}%`,
            color: ["#0358F7", "#C679C4", "#FFB005", "#5092C7", "#FA3D1D"][i % 5],
            opacity: 0.35 + (i % 4) * 0.1,
          }}
        />
      ))}

      {/* Comet */}
      <div data-comet className="absolute opacity-0" style={{ left: -100, top: "30%" }}>
        <div className="relative">
          <div
            className="h-1 rounded-full"
            style={{
              width: 80,
              background: "linear-gradient(90deg, transparent, rgba(255, 176, 5, 0.6), #FFB005)",
            }}
          />
          <div
            className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
            style={{
              background: "#FFD666",
              boxShadow: "0 0 8px rgba(255, 176, 5, 0.8)",
            }}
          />
        </div>
      </div>

      {/* Soft ambient glow behind center */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(3, 88, 247, 0.06) 0%, rgba(198, 121, 196, 0.04) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}

function PulseRing({ active, color }: { active: boolean; color: string }) {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ringRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(ringRef.current, { scale: 1, opacity: 0.5 }, {
        scale: 2.5,
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
        repeat: -1,
      });
    });
    return () => ctx.revert();
  }, [active]);

  if (!active) return null;
  return (
    <div
      ref={ringRef}
      className="absolute inset-0 rounded-full"
      style={{ border: `2px solid ${color}` }}
    />
  );
}

export function SimulationPage({ project, onComplete, onError }: SimulationPageProps) {
  const [phase, setPhase] = useState<Phase>("creating");
  const [simPhase, setSimPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logCountRef = useRef(0);
  const projectIdRef = useRef<string | null>(null);
  const ranRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (logPollRef.current) { clearInterval(logPollRef.current); logPollRef.current = null; }
  }, []);

  const startLogPolling = useCallback((pid: string) => {
    projectIdRef.current = pid;
    logCountRef.current = 0;
    logPollRef.current = setInterval(async () => {
      const res = await fetchProgressLogs(pid, logCountRef.current);
      const newMsgs = res.data.messages;
      if (newMsgs.length > 0) {
        logCountRef.current += newMsgs.length;
        setLogs(prev => [...prev, ...newMsgs]);
      }
    }, 1200);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (cardRef.current) {
        gsap.from(cardRef.current, {
          y: 50,
          opacity: 0,
          scale: 0.92,
          duration: 1,
          ease: "power3.out",
        });
      }
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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
          throw new Error("No content found for this product. Try adding seed URLs (Wikipedia, reviews, Reddit threads).");
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
              setTimeout(() => onComplete(pid), 800);
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
  const stepColors = ["#0358F7", "#C679C4", "#FFB005", "#FA3D1D"];

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #F8F8F8 0%, #F0F0F8 50%, #F8F8F8 100%)" }}>
      <CosmicBackground />

      <div className="relative z-10 w-full max-w-md">
        <div ref={cardRef} className="card-dia p-9" style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.92)" }}>
          <h2 className="text-center font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
            {phase === "failed" ? "Study Failed" : phase === "done" ? "Study Complete" : "Setting Up Your Study"}
          </h2>
          <p className="mt-2 text-center text-sm text-[rgba(0,0,0,0.45)]">
            {project.productName}
          </p>

          <div className="mt-10 space-y-0">
            {PHASE_ORDER.map((p, i) => {
              if (p === "done") return null;
              const isActive = i === currentIdx;
              const isDone = i < currentIdx || phase === "done";
              const isFailed = phase === "failed" && isActive;
              return (
                <div key={p} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <PulseRing active={isActive && !isFailed} color={stepColors[i]} />
                      <div
                        className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-500 ${
                          isFailed ? "bg-[#FA3D1D]/12 text-[#FA3D1D]" :
                          isDone ? "bg-emerald-50 text-emerald-600" :
                          isActive ? "text-white" :
                          "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.25)]"
                        }`}
                        style={isActive && !isFailed ? {
                          backgroundColor: stepColors[i],
                          boxShadow: `0 0 20px ${stepColors[i]}40`,
                        } : undefined}
                      >
                        {isFailed ? "!" : isDone ? "\u2713" : isActive ? (
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                        ) : i + 1}
                      </div>
                    </div>
                    {i < PHASE_ORDER.length - 2 && (
                      <div
                        className="h-10 w-px transition-colors duration-700"
                        style={{
                          backgroundColor: isDone
                            ? "rgb(167 243 208)"
                            : isActive
                              ? `${stepColors[i]}40`
                              : "rgba(0,0,0,0.08)",
                        }}
                      />
                    )}
                  </div>
                  <div className="pb-10">
                    <p className={`text-[0.9375rem] font-medium transition-colors duration-500 ${
                      isFailed ? "text-[#FA3D1D]" : isDone ? "text-emerald-600" : isActive ? "text-[rgba(0,0,0,0.85)]" : "text-[rgba(0,0,0,0.3)]"
                    }`}>
                      {PHASE_LABELS[p]}
                    </p>
                    {isActive && p === "polling" && simPhase && (
                      <p className="mt-0.5 animate-fade-in text-xs text-[rgba(0,0,0,0.4)]">Phase: {simPhase}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {logs.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl bg-[rgba(0,0,0,0.03)] px-4 py-3">
              {logs.map((msg, i) => (
                <div
                  key={`${i}-${msg.slice(0, 20)}`}
                  className="flex gap-2 py-[3px] text-[0.8125rem] leading-relaxed text-[rgba(0,0,0,0.55)] animate-fade-in"
                >
                  <span className="shrink-0 select-none text-[rgba(0,0,0,0.2)]">&rsaquo;</span>
                  <span>{msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}

          {phase === "done" && (
            <div className="mt-2 animate-fade-in rounded-2xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700">
              Loading dashboard...
            </div>
          )}

          {phase === "failed" && (
            <div className="mt-2 animate-fade-in space-y-3">
              <div className="rounded-2xl bg-[#FA3D1D]/8 p-4 text-sm text-[#D42E11]">
                {error ?? "An unknown error occurred."}
              </div>
              <button type="button" onClick={onError} className="btn-secondary w-full">
                Start Over
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
