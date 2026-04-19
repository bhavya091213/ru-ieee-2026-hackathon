import { useEffect, useRef } from "react";
import gsap from "gsap";

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from("[data-badge]", { opacity: 0, scale: 0.8, duration: 0.5 })
      .from("[data-headline]", { opacity: 0, y: 30, duration: 0.6 }, "-=0.2")
      .from("[data-subtext]", { opacity: 0, y: 20, duration: 0.5 }, "-=0.3")
      .from("[data-cta]", { opacity: 0, y: 20, scale: 0.95, duration: 0.5 }, "-=0.2")
      .from("[data-stat]", { opacity: 0, y: 15, stagger: 0.1, duration: 0.4 }, "-=0.2")
      .from("[data-line]", { scaleX: 0, duration: 0.6 }, "-=0.2");
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(57,255,20,1) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(57,255,20,0.08)_0%,transparent_70%)]" />

      <div ref={containerRef} className="relative w-full max-w-lg text-center">
        <div className="mb-8" data-badge>
          <span className="inline-block border border-[var(--color-vgreen)] bg-[var(--color-vgreen)]/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-vgreen)] font-[family-name:var(--font-display)]">
            PanelForge
          </span>
        </div>

        <h1 data-headline className="font-[family-name:var(--font-display)] text-5xl font-bold uppercase tracking-tight text-[var(--color-text)] sm:text-6xl">
          AI Focus Groups,
          <br />
          <span className="text-[var(--color-vgreen)] drop-shadow-[0_0_20px_rgba(57,255,20,0.3)]">
            Instantly.
          </span>
        </h1>

        <p data-subtext className="mx-auto mt-6 max-w-md text-base leading-relaxed text-[var(--color-text-dim)]">
          Enter a product. Get synthetic consumer personas, evidence-grounded
          reactions, and an actionable dashboard in minutes.
        </p>

        <button
          data-cta
          className="btn-primary mt-10 inline-flex items-center gap-2 text-base font-bold tracking-wider"
          onClick={onStart}
          type="button"
        >
          Start New Study
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="mx-auto mt-16 grid max-w-sm grid-cols-3 gap-6 text-center">
          {[
            { value: "5+", label: "Personas" },
            { value: "50+", label: "Evidence" },
            { value: "2", label: "Rounds" },
          ].map((s) => (
            <div key={s.label} data-stat>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-vgreen)]">{s.value}</p>
              <p className="mt-1 text-sm uppercase tracking-wider text-[var(--color-text-faint)]">{s.label}</p>
            </div>
          ))}
        </div>

        <div data-line className="glow-line mx-auto mt-16 w-48 origin-center" />
      </div>
    </main>
  );
}
