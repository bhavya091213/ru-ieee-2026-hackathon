import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ConsensusChart } from "../components/ConsensusChart";
import { DisagreementRadar } from "../components/DisagreementRadar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { FeatureHeatmap } from "../components/FeatureHeatmap";
import { KPICards } from "../components/KPICards";
import { PersonaTable } from "../components/PersonaTable";
import { QuoteWall } from "../components/QuoteWall";
import { TribePanel } from "../components/TribePanel";
import { useDashboard } from "../hooks/useDashboard";

interface DashboardPageProps {
  projectId: string | null;
  productName: string;
  onNewStudy: () => void;
  onExplore?: () => void;
}

const TABS = ["Overview", "Personas", "Evidence", "Insights"] as const;
type Tab = (typeof TABS)[number];

export function DashboardPage({ projectId, productName, onNewStudy, onExplore }: DashboardPageProps) {
  const { data, dataSource, loading } = useDashboard(projectId);
  const [tab, setTab] = useState<Tab>("Overview");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !data) return;

    const cards = el.querySelectorAll("[data-reveal]");
    if (cards.length === 0) return;

    gsap.set(cards, { opacity: 0, y: 24 });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.45,
      stagger: 0.08,
      ease: "power2.out",
      delay: 0.05,
    });
  }, [tab, data]);

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-surface-border)] border-t-[var(--color-vgreen)]" />
          <p className="mt-3 text-sm text-[var(--color-text-dim)]">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[var(--color-text-dim)]">No dashboard data available.</p>
          <button type="button" onClick={onNewStudy} className="btn-primary mt-4">Start New Study</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--color-surface-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-vgreen)]">PanelForge</span>
              {dataSource === "mock" && (
                <span className="border border-[var(--color-vyellow)]/30 bg-[var(--color-vyellow)]/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-vyellow)]">
                  Mock
                </span>
              )}
            </div>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">
              {productName || "Focus Group Dashboard"}
            </h1>
            <div className="mt-1 flex gap-4 text-xs text-[var(--color-text-faint)]">
              <span>{data.personas.length} personas</span>
              <span>2 rounds</span>
              <span>{data.tribe?.enabled ? "TRIBE active" : "TRIBE off"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {onExplore && (
              <button type="button" onClick={onExplore} className="border border-[var(--color-vcyan)]/30 bg-[var(--color-vcyan)]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-vcyan)] transition hover:bg-[var(--color-vcyan)]/20">
                Explore Data
              </button>
            )}
            <button type="button" onClick={onNewStudy} className="btn-secondary text-sm">New Study</button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-6">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`border-b-2 pb-3 pt-1 text-sm font-semibold uppercase tracking-wider transition ${
                  tab === t
                    ? "border-[var(--color-vgreen)] text-[var(--color-vgreen)]"
                    : "border-transparent text-[var(--color-text-faint)] hover:text-[var(--color-text-dim)]"
                }`}>
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div ref={contentRef} className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "Overview" && (
          <div className="space-y-6">
            <div data-reveal><KPICards consensus={data.consensus_score} disagreement={data.disagreement_score} evidenceCoverage={data.evidence_coverage} /></div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div data-reveal><ErrorBoundary><ConsensusChart featureScores={data.feature_scores} /></ErrorBoundary></div>
              <div data-reveal><ErrorBoundary><DisagreementRadar featureScores={data.feature_scores} /></ErrorBoundary></div>
            </div>
            <div data-reveal><TribePanel tribe={data.tribe} /></div>
          </div>
        )}

        {tab === "Personas" && (
          <div data-reveal>
            <PersonaTable personas={data.personas} round1Responses={data.round1_responses} round2Responses={data.round2_responses} />
          </div>
        )}

        {tab === "Evidence" && (
          <div className="space-y-6">
            <div data-reveal><ErrorBoundary><FeatureHeatmap featureScores={data.feature_scores} personas={data.personas} /></ErrorBoundary></div>
            <div data-reveal><QuoteWall quotes={data.quotes} /></div>
          </div>
        )}

        {tab === "Insights" && (
          <div className="space-y-6">
            <div data-reveal className="card p-6">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Analyst Summary</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-vgreen)]">Consensus Themes</h3>
                  <ul className="space-y-1.5">{data.analyst_summary.consensus_themes.map((t) => <li key={t} className="text-sm text-[var(--color-text-dim)]">{t}</li>)}</ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-vyellow)]">Disagreement</h3>
                  <ul className="space-y-1.5">{data.analyst_summary.disagreement_themes.map((t) => <li key={t} className="text-sm text-[var(--color-text-dim)]">{t}</li>)}</ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-vred)]">Top Risks</h3>
                  <ul className="space-y-1.5">{data.analyst_summary.top_risks.map((r) => <li key={r} className="text-sm text-[var(--color-text-dim)]">{r}</li>)}</ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-vcyan)]">Recommendations</h3>
                  <ul className="space-y-1.5">{data.analyst_summary.feature_recommendations.map((r) => <li key={r} className="text-sm text-[var(--color-text-dim)]">{r}</li>)}</ul>
                </div>
              </div>
              {data.analyst_summary.evidence_gaps.length > 0 && (
                <div className="mt-6 border border-[var(--color-surface-border)] bg-[var(--color-bg-deep)] p-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Evidence Gaps</h3>
                  <ul className="space-y-1">{data.analyst_summary.evidence_gaps.map((g) => <li key={g} className="text-sm text-[var(--color-text-faint)]">{g}</li>)}</ul>
                </div>
              )}
            </div>
            {data.moderator_question && (
              <div data-reveal className="card p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[var(--color-text)]">Moderator Follow-Up</h2>
                <p className="mt-2 italic text-[var(--color-text-dim)]">"{data.moderator_question}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
