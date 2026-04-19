import { useState } from "react";
import { AdoptionShift } from "../components/AdoptionShift";
import { ConsensusChart } from "../components/ConsensusChart";
import { DisagreementRadar } from "../components/DisagreementRadar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { FeatureHeatmap } from "../components/FeatureHeatmap";
import { KPICards } from "../components/KPICards";
import { PersonaTable } from "../components/PersonaTable";
import { QuoteWall } from "../components/QuoteWall";
import { RoundTimeline } from "../components/RoundTimeline";
import { TopicGraph } from "../components/TopicGraph";
import { TribePanel } from "../components/TribePanel";
import { useDashboard } from "../hooks/useDashboard";

interface DashboardPageProps {
  projectId: string | null;
  productName: string;
  onNewStudy: () => void;
  onExplore?: () => void;
}

const TABS = ["Overview", "Personas", "Discussion", "Evidence", "Insights"] as const;
type Tab = (typeof TABS)[number];

export function DashboardPage({ projectId, productName, onNewStudy, onExplore }: DashboardPageProps) {
  const { data, dataSource, loading } = useDashboard(projectId);
  const [tab, setTab] = useState<Tab>("Overview");

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.1)] border-t-[rgba(0,0,0,0.7)]" />
          <p className="mt-3 text-sm text-[rgba(0,0,0,0.45)]">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[rgba(0,0,0,0.5)]">No dashboard data available.</p>
          <button type="button" onClick={onNewStudy} className="btn-primary mt-4">Start New Study</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Glassmorphism Header */}
      <header className="glass-header sticky top-0 z-50 border-b border-[rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-[0.15em] text-[rgba(0,0,0,0.5)]">PanelForge</span>
              {dataSource === "mock" && (
                <span className="rounded-full bg-[#FFB005]/12 px-2.5 py-0.5 text-xs font-medium text-[#9A6B00]">
                  Mock Data
                </span>
              )}
            </div>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">
              {productName || "Focus Group Dashboard"}
            </h1>
            <div className="mt-1 flex gap-4 text-xs text-[rgba(0,0,0,0.35)]">
              <span>{data.personas.length} personas</span>
              <span>2 rounds</span>
              <span>{data.tribe?.enabled ? "TRIBE active" : "TRIBE off"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {onExplore && (
              <button type="button" onClick={onExplore} className="rounded-full bg-[rgba(0,0,0,0.06)] px-4 py-2 text-sm font-medium text-[rgba(0,0,0,0.7)] transition hover:bg-[rgba(0,0,0,0.1)]">
                Explore Data
              </button>
            )}
            <button type="button" onClick={onNewStudy} className="btn-secondary text-sm">
              New Study
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-8">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`border-b-2 pb-3 pt-1 text-sm font-medium transition ${
                  tab === t
                    ? "border-[rgba(0,0,0,0.85)] text-[rgba(0,0,0,0.85)]"
                    : "border-transparent text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.6)]"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {tab === "Overview" && (
          <div className="animate-fade-in space-y-6">
            <KPICards
              consensus={data.consensus_score}
              disagreement={data.disagreement_score}
              evidenceCoverage={data.evidence_coverage}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              <ErrorBoundary>
                <ConsensusChart featureScores={data.feature_scores} />
              </ErrorBoundary>
              <ErrorBoundary>
                <DisagreementRadar featureScores={data.feature_scores} />
              </ErrorBoundary>
            </div>
            <ErrorBoundary>
              <AdoptionShift
                personas={data.personas}
                round1Responses={data.round1_responses}
                round2Responses={data.round2_responses}
              />
            </ErrorBoundary>
            <TribePanel tribe={data.tribe} />
          </div>
        )}

        {tab === "Personas" && (
          <div className="animate-fade-in space-y-6">
            <PersonaTable
              personas={data.personas}
              round1Responses={data.round1_responses}
              round2Responses={data.round2_responses}
            />
            <ErrorBoundary>
              <FeatureHeatmap featureScores={data.feature_scores} personas={data.personas} />
            </ErrorBoundary>
          </div>
        )}

        {tab === "Discussion" && (
          <div className="animate-fade-in space-y-6">
            <ErrorBoundary>
              <RoundTimeline
                personas={data.personas}
                round1Responses={data.round1_responses}
                round2Responses={data.round2_responses}
                moderatorQuestion={data.moderator_question}
              />
            </ErrorBoundary>
          </div>
        )}

        {tab === "Evidence" && (
          <div className="animate-fade-in space-y-6">
            <ErrorBoundary>
              <TopicGraph projectId={projectId} />
            </ErrorBoundary>
            <QuoteWall quotes={data.quotes} />
          </div>
        )}

        {tab === "Insights" && (
          <div className="animate-fade-in space-y-6">
            <div className="card-dia p-7">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Analyst Summary</h2>
              <div className="mt-6 grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-emerald-600">Consensus Themes</h3>
                  <ul className="space-y-2">
                    {data.analyst_summary.consensus_themes.map((t) => (
                      <li key={t} className="text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.6)]">{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#FFB005]">Disagreement Themes</h3>
                  <ul className="space-y-2">
                    {data.analyst_summary.disagreement_themes.map((t) => (
                      <li key={t} className="text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.6)]">{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#FA3D1D]">Top Risks</h3>
                  <ul className="space-y-2">
                    {data.analyst_summary.top_risks.map((r) => (
                      <li key={r} className="text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.6)]">{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#0358F7]">Recommendations</h3>
                  <ul className="space-y-2">
                    {data.analyst_summary.feature_recommendations.map((r) => (
                      <li key={r} className="text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.6)]">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {data.analyst_summary.messaging_suggestions.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[#C679C4]">Messaging Suggestions</h3>
                  <ul className="space-y-2">
                    {data.analyst_summary.messaging_suggestions.map((s) => (
                      <li key={s} className="text-[0.9375rem] leading-relaxed text-[rgba(0,0,0,0.6)]">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.analyst_summary.evidence_gaps.length > 0 && (
                <div className="mt-8 rounded-2xl bg-[rgba(0,0,0,0.03)] p-5">
                  <h3 className="mb-3 font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[rgba(0,0,0,0.5)]">Evidence Gaps</h3>
                  <ul className="space-y-1.5">
                    {data.analyst_summary.evidence_gaps.map((g) => (
                      <li key={g} className="text-sm text-[rgba(0,0,0,0.45)]">{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {data.moderator_question && (
              <div className="card-dia p-7">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-light tracking-[-0.02em] text-[rgba(0,0,0,0.85)]">Moderator Follow-Up</h2>
                <p className="mt-3 font-[family-name:var(--font-display)] text-lg italic text-[rgba(0,0,0,0.6)]">&ldquo;{data.moderator_question}&rdquo;</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
