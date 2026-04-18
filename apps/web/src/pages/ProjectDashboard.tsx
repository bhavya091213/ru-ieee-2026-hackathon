import { useMemo } from "react";

import { ConsensusChart } from "../components/ConsensusChart";
import { DisagreementRadar } from "../components/DisagreementRadar";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { EvidenceGraph } from "../components/EvidenceGraph";
import { FeatureHeatmap } from "../components/FeatureHeatmap";
import { Header } from "../components/Header";
import { KPICards } from "../components/KPICards";
import { PersonaTable } from "../components/PersonaTable";
import { QuoteWall } from "../components/QuoteWall";
import { ScenarioEditor } from "../components/ScenarioEditor";
import { TribePanel } from "../components/TribePanel";
import { useDashboard } from "../hooks/useDashboard";

interface ProjectDashboardProps {
  onSearchAgain: () => void;
  projectId: string | null;
}

export function ProjectDashboard({
  onSearchAgain,
  projectId,
}: ProjectDashboardProps) {
  const { data, dataSource, loading, refresh } = useDashboard(projectId);

  const renderState = useMemo(() => {
    if (loading && !data) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 px-8 py-6 text-slate-600 shadow-lg shadow-slate-200/70">
            Loading dashboard...
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-8 py-6 text-rose-700 shadow-lg shadow-rose-100/80">
            Unable to load dashboard data. Please try again.
          </div>
        </div>
      );
    }

    return (
      <main className="min-h-screen px-6 py-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="col-span-full">
            <Header
              data={data}
              dataSource={dataSource}
              onSearchAgain={onSearchAgain}
            />
          </div>

          <div className="col-span-full">
            <KPICards
              consensus={data.consensus_score}
              disagreement={data.disagreement_score}
              evidenceCoverage={data.evidence_coverage}
            />
          </div>

          <ErrorBoundary>
            <FeatureHeatmap
              featureScores={data.feature_scores}
              personas={data.personas}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <EvidenceGraph />
          </ErrorBoundary>

          <PersonaTable
            personas={data.personas}
            round1Responses={data.round1_responses}
            round2Responses={data.round2_responses}
          />

          <QuoteWall quotes={data.quotes} />

          <ScenarioEditor onRerun={refresh} />

          <TribePanel tribe={data.tribe} />

          <ErrorBoundary>
            <ConsensusChart featureScores={data.feature_scores} />
          </ErrorBoundary>

          <ErrorBoundary>
            <DisagreementRadar featureScores={data.feature_scores} />
          </ErrorBoundary>
        </div>
      </main>
    );
  }, [data, dataSource, loading, onSearchAgain, refresh]);

  return renderState;
}
