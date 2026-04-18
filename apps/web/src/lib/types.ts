export interface DashboardPayload {
  project_id: string;
  scenario_id: string;
  consensus_score: number;
  disagreement_score: number;
  evidence_coverage: number;
  top_risks: ScoredLabel[];
  top_wins: ScoredLabel[];
  feature_scores: Record<string, FeatureScoreRow>;
  personas: PersonaSummary[];
  quotes: QuoteCard[];
  round1_responses: PersonaResponse[];
  round2_responses: PersonaResponse[];
  moderator_question: string;
  analyst_summary: AnalystSummary;
  tribe: TribeResult | null;
}

export interface PersonaSummary {
  persona_id: string;
  segment_label: string;
  summary: string;
  adoption_likelihood: number;
  strongest_positive: string;
  strongest_concern: string;
  feature_priorities: Record<string, number>;
}

export interface PersonaResponse {
  persona_id: string;
  overall_reaction: string;
  adoption_likelihood_0_100: number;
  strongest_positive: string;
  strongest_concern: string;
  feature_scores: Record<string, number>;
  cited_chunk_ids: string[];
}

export interface QuoteCard {
  persona_id: string;
  segment_label: string;
  quote: string;
  facet: string;
  sentiment: string;
}

export interface FeatureScoreRow {
  mean: number;
  min: number;
  max: number;
  std: number;
  persona_scores: Record<string, number>;
}

export interface ScoredLabel {
  label: string;
  score: number;
}

export interface TribeResult {
  enabled: boolean;
  response_strength: number;
  response_variance: number;
  response_spread: number;
  scored_text: string;
}

export interface AnalystSummary {
  consensus_themes: string[];
  disagreement_themes: string[];
  top_risks: ScoredLabel[];
  top_wins: ScoredLabel[];
  feature_recommendations: string[];
  messaging_suggestions: string[];
  evidence_gaps: string[];
}

export interface IngestStatus {
  status: string;
  source_count: number;
  chunk_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "Product" | "Feature" | "Concern" | "Segment" | "Competitor";
  description: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
}
