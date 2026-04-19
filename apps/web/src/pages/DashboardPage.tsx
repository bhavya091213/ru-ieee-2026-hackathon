import { useState } from "react";
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

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="mt-3 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500">No dashboard data available.</p>
          <button type="button" onClick={onNewStudy} className="btn-primary mt-4">Start New Study</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">PanelForge</span>
              {dataSource === "mock" && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                  Mock Data
                </span>
              )}
            </div>
            <h1 className="mt-1 text-lg font-semibold text-gray-900">{productName || "Focus Group Dashboard"}</h1>
            <div className="mt-1 flex gap-4 text-xs text-gray-400">
              <span>{data.personas.length} personas</span>
              <span>2 rounds</span>
              <span>{data.tribe?.enabled ? "TRIBE active" : "TRIBE off"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {onExplore && (
              <button type="button" onClick={onExplore} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100">
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
          <nav className="-mb-px flex gap-6">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`border-b-2 pb-3 pt-1 text-sm font-medium transition ${
                  tab === t
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
          </div>
        )}

        {tab === "Evidence" && (
          <div className="animate-fade-in space-y-6">
            <ErrorBoundary>
              <FeatureHeatmap featureScores={data.feature_scores} personas={data.personas} />
            </ErrorBoundary>
            <QuoteWall quotes={data.quotes} />
          </div>
        )}

        {tab === "Insights" && (
          <div className="animate-fade-in space-y-6">
            {/* Analyst Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Analyst Summary</h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-green-600">Consensus Themes</h3>
                  <ul className="space-y-1.5">
                    {data.analyst_summary.consensus_themes.map((t) => (
                      <li key={t} className="text-sm text-gray-600">{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-amber-600">Disagreement Themes</h3>
                  <ul className="space-y-1.5">
                    {data.analyst_summary.disagreement_themes.map((t) => (
                      <li key={t} className="text-sm text-gray-600">{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-red-600">Top Risks</h3>
                  <ul className="space-y-1.5">
                    {data.analyst_summary.top_risks.map((r) => (
                      <li key={r} className="text-sm text-gray-600">{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-blue-600">Recommendations</h3>
                  <ul className="space-y-1.5">
                    {data.analyst_summary.feature_recommendations.map((r) => (
                      <li key={r} className="text-sm text-gray-600">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {data.analyst_summary.evidence_gaps.length > 0 && (
                <div className="mt-6 rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">Evidence Gaps</h3>
                  <ul className="space-y-1">
                    {data.analyst_summary.evidence_gaps.map((g) => (
                      <li key={g} className="text-sm text-gray-500">{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {data.moderator_question && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Moderator Follow-Up</h2>
                <p className="mt-2 text-gray-600 italic">"{data.moderator_question}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
