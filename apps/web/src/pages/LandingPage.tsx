import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onStart: () => void;
}

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Ingest Sources",
    desc: "Feed in URLs — Reddit threads, YouTube reviews, articles. We chunk, embed, and build a knowledge graph from real consumer opinions.",
    example: "reddit.com/r/iphone  ·  youtube.com/mkbhd  ·  theverge.com/review",
    color: "#0358F7",
  },
  {
    num: "02",
    title: "Extract Entities & Claims",
    desc: "Our graph extraction pipeline identifies products, features, concerns, and competitors — then maps relationships between them.",
    example: '"iPhone 18 Pro" → HAS_FEATURE → "48MP Camera" → COMPETES_WITH → "Galaxy S26"',
    color: "#C679C4",
  },
  {
    num: "03",
    title: "Generate Personas",
    desc: "Using community detection on the knowledge graph, we cluster opinions into distinct consumer archetypes grounded in real evidence.",
    example: "Tech Enthusiast  ·  Budget Buyer  ·  Privacy Advocate  ·  Ecosystem Loyalist  ·  Camera Pro",
    color: "#FFB005",
  },
  {
    num: "04",
    title: "Simulate Focus Group",
    desc: "Each persona reacts to your hypotheses across two rounds — initial impressions then deliberation — citing real evidence from the corpus.",
    example: 'Round 1: "The camera upgrade is compelling, but $1,299 is steep..." → Round 2: "After seeing the computational photo samples, I\'d pay it."',
    color: "#FA3D1D",
  },
  {
    num: "05",
    title: "Score & Analyze",
    desc: "TRIBE heuristic scoring measures response strength, variance, and spread. An analyst summary highlights consensus, risks, and recommendations.",
    example: "Consensus: 78%  ·  Top Risk: Price sensitivity  ·  Recommendation: Lead with camera in marketing",
    color: "#5092C7",
  },
];

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) clearInterval(interval); }, 22);
    return () => clearInterval(interval);
  }, [text, started]);
  return (
    <p className="break-words font-[family-name:var(--font-mono)] text-sm leading-relaxed text-[rgba(0,0,0,0.5)]">
      {displayed}<span className="ml-0.5 inline-block w-0.5 animate-[blink-caret_1s_step-end_infinite] border-r-2 border-[rgba(0,0,0,0.5)]">&nbsp;</span>
    </p>
  );
}

function ProcessCard({ step, index }: { step: typeof PROCESS_STEPS[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = (y - rect.height / 2) / 18;
    const rotateY = (rect.width / 2 - x) / 18;
    gsap.to(card, { rotateX, rotateY, duration: 0.35, ease: "power2.out", transformPerspective: 700 });
    gsap.to(glow, { x: x - 120, y: y - 120, opacity: 0.18, duration: 0.25 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current) gsap.to(cardRef.current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    if (glowRef.current) gsap.to(glowRef.current, { opacity: 0, duration: 0.4 });
  }, []);

  const isLast = index === PROCESS_STEPS.length - 1;

  return (
    <div className="process-card grid grid-cols-[48px_1fr] gap-6 md:gap-8">
      {/* Left: timeline column */}
      <div className="flex flex-col items-center">
        {/* Numbered dot */}
        <div
          className="step-dot flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-mono)] text-xs font-bold text-white"
          style={{ backgroundColor: step.color }}
        >
          {step.num}
        </div>
        {/* Connector */}
        {!isLast && (
          <div className="connector-line relative mt-1 w-px flex-1" style={{ background: `linear-gradient(to bottom, ${step.color}40, ${PROCESS_STEPS[index + 1].color}40)` }}>
            <div
              className="connector-dot absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: step.color, boxShadow: `0 0 6px ${step.color}50` }}
            />
          </div>
        )}
      </div>

      {/* Right: card content */}
      <div className="pb-8">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="step-card card-dia relative cursor-default overflow-hidden"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Glow */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute h-[240px] w-[240px] rounded-full opacity-0"
            style={{ background: `radial-gradient(circle, ${step.color}30 0%, transparent 70%)`, filter: "blur(25px)" }}
          />

          {/* Accent bar */}
          <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${step.color}, ${step.color}20)` }} />

          <div className="relative z-10 p-6 sm:p-7">
            {/* Title row */}
            <h3 className="step-title font-[family-name:var(--font-display)] text-2xl font-light tracking-[-0.02em]" style={{ color: step.color }}>
              {step.title}
            </h3>
            <p className="step-desc mt-2.5 max-w-lg text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.55)]">
              {step.desc}
            </p>

            {/* Example box */}
            <div
              className="step-example mt-5 rounded-2xl border p-4"
              style={{ borderColor: `${step.color}18`, backgroundColor: `${step.color}06` }}
            >
              <p className="mb-1.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: `${step.color}` }}>
                iPhone 18 Pro
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[13px] leading-relaxed text-[rgba(0,0,0,0.6)]">
                {step.example}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onStart }: LandingPageProps) {
  const heroRef = useRef<HTMLElement>(null);
  const processRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Hero entrance ──
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .from("[data-hero-badge]", { opacity: 0, y: -20, scale: 0.9, duration: 0.6 })
        .from("[data-hero-h1]", { opacity: 0, y: 50, duration: 0.9, ease: "power2.out" }, "-=0.3")
        .from("[data-hero-sub]", { opacity: 0, y: 30, duration: 0.6 }, "-=0.5")
        .from("[data-hero-cta]", { opacity: 0, y: 20, scale: 0.95, duration: 0.5 }, "-=0.3")
        .from("[data-hero-preview]", {
          opacity: 0, y: 80, scale: 0.88, rotateX: 12,
          duration: 1.2, ease: "power2.out", transformPerspective: 1200,
        }, "-=0.4")
        .from("[data-hero-scroll]", { opacity: 0, y: -10, duration: 0.4 }, "-=0.5");

      // ── Hero parallax ──
      gsap.to("[data-hero-preview]", {
        y: -60, scale: 0.94, rotateX: -3,
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 1.5 },
      });
      gsap.to("[data-chroma-glow]", {
        y: 150, scale: 1.4, opacity: 0.08,
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 2 },
      });

      // ── Process heading ──
      const headingWords = document.querySelectorAll("[data-process-word]");
      if (headingWords.length > 0) {
        gsap.from(headingWords, {
          opacity: 0.15, y: 8, stagger: 0.04, duration: 0.5, ease: "power2.out",
          scrollTrigger: { trigger: "[data-process-heading]", start: "top 80%" },
        });
      }
      gsap.from("[data-process-label]", {
        opacity: 0, y: 20, duration: 0.6,
        scrollTrigger: { trigger: "[data-process-heading]", start: "top 85%" },
      });
      gsap.from("[data-process-sub]", {
        opacity: 0, y: 20, duration: 0.6,
        scrollTrigger: { trigger: "[data-process-heading]", start: "top 75%" },
      });

      // ── Process cards ──
      const cards = gsap.utils.toArray<HTMLElement>(".process-card");
      cards.forEach((card, i) => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" },
        });

        // Dot pops in
        tl.from(card.querySelector(".step-dot"), {
          scale: 0, opacity: 0, duration: 0.4, ease: "back.out(2.5)",
        });

        // Card slides up with subtle 3D
        tl.from(card.querySelector(".step-card"), {
          opacity: 0, y: 50, scale: 0.96, duration: 0.7, ease: "power3.out",
        }, "-=0.2");

        // Title and desc stagger
        tl.from(card.querySelector(".step-title"), {
          opacity: 0, y: 12, duration: 0.4, ease: "power2.out",
        }, "-=0.4");
        tl.from(card.querySelector(".step-desc"), {
          opacity: 0, y: 10, duration: 0.35, ease: "power2.out",
        }, "-=0.25");

        // Example slides up
        tl.from(card.querySelector(".step-example"), {
          opacity: 0, y: 20, scale: 0.97, duration: 0.5, ease: "power2.out",
        }, "-=0.2");

        // Connector draws in
        const connector = card.querySelector(".connector-line");
        const dot = card.querySelector(".connector-dot");
        if (connector) {
          tl.from(connector, { scaleY: 0, transformOrigin: "top", duration: 0.4, ease: "power1.inOut" }, "-=0.1");
        }
        if (dot) {
          tl.from(dot, { scale: 0, opacity: 0, duration: 0.25, ease: "back.out(3)" }, "-=0.05");
          gsap.to(dot, { y: 10, repeat: -1, yoyo: true, duration: 1.8, ease: "sine.inOut" });
        }

        // Subtle parallax per card
        gsap.to(card.querySelector(".step-card"), {
          y: -(6 + i * 2),
          scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 2 },
        });
      });

      // ── Stats ──
      gsap.from("[data-stat-item]", {
        opacity: 0, y: 40, scale: 0.85, stagger: 0.1, duration: 0.7, ease: "power2.out",
        scrollTrigger: { trigger: statsRef.current, start: "top 82%" },
      });

      // ── CTA ──
      const ctaTl = gsap.timeline({
        scrollTrigger: { trigger: ctaRef.current, start: "top 75%" },
      });
      ctaTl
        .from("[data-cta-glow]", { opacity: 0, scale: 0.5, duration: 1.2, ease: "power2.out" })
        .from("[data-cta-h2]", { opacity: 0, y: 40, duration: 0.7, ease: "power2.out" }, "-=0.7")
        .from("[data-cta-p]", { opacity: 0, y: 25, duration: 0.5 }, "-=0.4")
        .from("[data-cta-btn]", { opacity: 0, y: 15, scale: 0.9, duration: 0.5, ease: "back.out(2)" }, "-=0.3");
    });

    return () => ctx.revert();
  }, []);

  const headingText = "From raw opinions to actionable insights";
  const headingWords = headingText.split(" ");

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ── HERO ── */}
      <section ref={heroRef} className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20">
        <div data-chroma-glow className="chroma-bg pointer-events-none absolute top-[-10%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full" />

        <div className="relative w-full max-w-4xl text-center" style={{ perspective: "1200px" }}>
          <div data-hero-badge className="mb-8">
            <span className="inline-block rounded-full bg-[rgba(0,0,0,0.04)] px-5 py-2 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.15em] text-[rgba(0,0,0,0.5)]">
              PanelForge
            </span>
          </div>

          <h1 data-hero-h1 className="font-[family-name:var(--font-display)] text-5xl font-light tracking-[-0.04em] text-[rgba(0,0,0,0.85)] sm:text-6xl lg:text-7xl">
            AI-Powered Focus Groups
            <br />
            <span className="chroma-text">in Minutes, Not Months.</span>
          </h1>

          <p data-hero-sub className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-[rgba(0,0,0,0.5)]">
            Drop in a product and source URLs. PanelForge ingests real consumer opinions,
            builds a knowledge graph, generates evidence-grounded personas, and runs a
            simulated focus group — complete with two deliberation rounds and analyst scoring.
          </p>

          <div data-hero-cta className="mt-10">
            <button className="btn-primary inline-flex items-center gap-2 text-base" onClick={onStart} type="button">
              Try with your product
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Dashboard preview */}
          <div data-hero-preview className="mx-auto mt-16 max-w-2xl" style={{ transformStyle: "preserve-3d" }}>
            <div className="card-dia overflow-hidden p-0 transition-shadow duration-500 hover:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-2 border-b border-[rgba(0,0,0,0.06)] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FA3D1D]/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFB005]/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
                </div>
                <div className="flex-1 rounded-lg bg-[rgba(0,0,0,0.04)] px-3 py-1 text-center">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-[rgba(0,0,0,0.35)]">panelforge.app/study/iphone-18-pro</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-[0.15em] text-[rgba(0,0,0,0.4)]">Study Results</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-light text-[rgba(0,0,0,0.85)]">iPhone 18 Pro</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">5 Personas</span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: "Consensus", value: "78%", bg: "bg-emerald-50", color: "text-emerald-700" },
                    { label: "Disagreement", value: "24%", bg: "bg-[#FFB005]/8", color: "text-[#9A6B00]" },
                    { label: "Evidence", value: "92%", bg: "bg-[#0358F7]/8", color: "text-[#0358F7]" },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`rounded-2xl ${kpi.bg} p-3.5`}>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[rgba(0,0,0,0.4)]">{kpi.label}</p>
                      <p className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-light ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Tech Enthusiast", "Budget Buyer", "Privacy Advocate", "Camera Pro", "Ecosystem Loyalist"].map((p, i) => {
                    const colors = ["#0358F7", "#FFB005", "#FA3D1D", "#C679C4", "#5092C7"];
                    return (
                      <span key={p} className="animate-[count-up_0.5s_ease-out_forwards] rounded-full px-3 py-1 text-xs font-medium opacity-0"
                        style={{ backgroundColor: `${colors[i]}10`, color: colors[i], animationDelay: `${1.2 + i * 0.12}s` }}>
                        {p}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-2xl border border-[rgba(0,0,0,0.06)] p-3.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[rgba(0,0,0,0.35)]">Live Quote</p>
                  <TypewriterText text={'"The 48MP camera is a real upgrade, but at $1,299 I need to see the AI photo features in action before I commit."'} delay={1800} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div data-hero-scroll className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-[float_4s_ease-in-out_infinite]">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-[rgba(0,0,0,0.3)]">How it works</span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-[rgba(0,0,0,0.25)]">
              <rect x="1" y="1" width="14" height="22" rx="7" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="2" fill="currentColor" className="animate-[pulse-dot_2s_ease-in-out_infinite]" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section ref={processRef} className="mx-auto max-w-3xl px-4 py-28 sm:px-6">
        <div data-process-heading className="mb-16 text-center">
          <p data-process-label className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.2em] text-[rgba(0,0,0,0.4)]">
            The Pipeline
          </p>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-3xl font-light tracking-[-0.03em] text-[rgba(0,0,0,0.85)] sm:text-4xl lg:text-5xl">
            {headingWords.map((word, i) => (
              <span key={i} data-process-word className="inline-block mr-[0.3em]">
                {word === "actionable" || word === "insights" ? (
                  <span className="chroma-text">{word}</span>
                ) : word}
              </span>
            ))}
          </h2>
          <p data-process-sub className="mx-auto mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.5)]">
            Here's what happens when you study the <strong className="font-medium text-[rgba(0,0,0,0.7)]">iPhone 18 Pro</strong> with PanelForge.
            Every step is evidence-grounded — no synthetic fluff.
          </p>
        </div>

        <div>
          {PROCESS_STEPS.map((step, i) => (
            <ProcessCard key={step.num} step={step} index={i} />
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="border-y border-[rgba(0,0,0,0.06)] bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 py-20 text-center sm:grid-cols-4 sm:px-6">
          {[
            { value: "5+", label: "Personas Generated", sub: "Per study" },
            { value: "50+", label: "Evidence Chunks", sub: "Grounded citations" },
            { value: "2", label: "Deliberation Rounds", sub: "Initial + revised" },
            { value: "<5", label: "Minutes to Results", sub: "End to end" },
          ].map((s) => (
            <div key={s.label} data-stat-item className="group">
              <p className="font-[family-name:var(--font-display)] text-5xl font-light tracking-tight text-[rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-110">{s.value}</p>
              <p className="mt-3 text-sm font-medium text-[rgba(0,0,0,0.6)]">{s.label}</p>
              <p className="mt-0.5 text-xs text-[rgba(0,0,0,0.35)]">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaRef} className="relative overflow-hidden px-4 py-36">
        <div data-cta-glow className="chroma-bg pointer-events-none absolute bottom-[-20%] left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full" />
        <div className="relative mx-auto max-w-xl text-center">
          <h2 data-cta-h2 className="font-[family-name:var(--font-display)] text-3xl font-light tracking-[-0.03em] text-[rgba(0,0,0,0.85)] sm:text-4xl lg:text-5xl">
            Ready to run your study?
          </h2>
          <p data-cta-p className="mx-auto mt-5 max-w-md text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.5)]">
            Try it with your own product. No credit card, no waiting list — just paste your URLs and go.
          </p>
          <div data-cta-btn className="mt-10">
            <button className="btn-primary inline-flex items-center gap-2 text-base" onClick={onStart} type="button">
              Start New Study
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
