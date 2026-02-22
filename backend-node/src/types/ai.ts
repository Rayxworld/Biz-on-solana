export interface TradeAnalysis {
  suggested_side: "yes" | "no" | "abstain";
  suggested_amount: number;
  confidence: number;
  reasoning: string;
  risk_score: number;
}

export interface AnalysisTelemetry {
  source: "llm" | "fallback_microstructure" | "fallback_no_liquidity" | "fallback_inactive";
  fallbackTriggered: boolean;
  notes: string[];
}

export interface AnalysisObservability {
  provider: "groq";
  model: string;
  latencyMs: number;
  usedFallback: boolean;
  guardrailBlocked: boolean;
}

export interface GuardrailResult {
  allowed: boolean;
  reasons: string[];
  analysis: TradeAnalysis;
}

export interface RiskMetrics {
  expected_payout: number;
  expected_value: number;
  kelly_optimal_fraction: number;
  kelly_optimal_amount: number;
  max_potential_loss: number;
  liquidity_impact: number;
  time_risk_factor: number;
  implied_probability: number;
}
