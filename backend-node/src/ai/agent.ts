import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { config } from "../config/index.js";
import { solanaClient } from "../solana/client.js";
import {
  enforceGuardrails,
  parseAnalysisOutput,
} from "./guardrails.js";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "./prompts.js";
import { logAnalysis } from "../services/logger.js";
import type { GuardrailResult, RiskMetrics, TradeAnalysis } from "../types/ai.js";
import type { MarketData, UserPosition } from "../types/market.js";

// ── Types ──
export interface AnalysisResult {
  analysis: TradeAnalysis;
  guardrails: GuardrailResult;
  marketData: MarketData | null;
  userPosition: UserPosition | null;
  riskMetrics: RiskMetrics | null;
  timestamp: string;
}

// ── LLM Instance ──
function createLLM(): ChatOpenAI {
  return new ChatOpenAI({
    modelName: config.openaiModel,
    openAIApiKey: config.openaiApiKey,
    temperature: 0.3, // Low temp for consistent analytical output
    maxTokens: 1024,
  });
}

// ── Risk metrics calculation (same logic as tool, but direct) ──
function calculateRiskMetrics(
  market: MarketData,
  betSide: "yes" | "no",
  betAmount: number
): RiskMetrics {
  const { totalPool, yesPool, noPool, yesOdds, noOdds, timeRemaining } = market;

  const newTotalPool = totalPool + betAmount;
  const winningPool =
    betSide === "yes" ? yesPool + betAmount : noPool + betAmount;

  const expectedPayout =
    winningPool > 0 ? (betAmount / winningPool) * newTotalPool : 0;

  const impliedProb = betSide === "yes" ? yesOdds : noOdds;
  const ev = expectedPayout * impliedProb - betAmount;

  const payoutRatio = expectedPayout / betAmount - 1;
  const kellyFraction =
    payoutRatio > 0
      ? Math.max(
          0,
          (payoutRatio * impliedProb - (1 - impliedProb)) / payoutRatio
        )
      : 0;

  const liquidityImpact = totalPool > 0 ? betAmount / totalPool : 1;

  const hoursRemaining = timeRemaining / 3600;
  const timeRisk =
    hoursRemaining < 24 ? 0.8 : hoursRemaining < 72 ? 0.5 : 0.2;

  return {
    expected_payout: Math.round(expectedPayout),
    expected_value: Math.round(ev),
    kelly_optimal_fraction: parseFloat(kellyFraction.toFixed(4)),
    kelly_optimal_amount: Math.round(kellyFraction * 100_000_000),
    max_potential_loss: betAmount,
    liquidity_impact: parseFloat(liquidityImpact.toFixed(4)),
    time_risk_factor: timeRisk,
    implied_probability: parseFloat(impliedProb.toFixed(4)),
  };
}

/**
 * Main AI analysis entry point.
 * Fetches market data → feeds to LLM → validates with guardrails → logs everything.
 */
export async function analyzeMarket(
  marketId: number,
  userPubkey: string
): Promise<AnalysisResult> {
  const llm = createLLM();

  // 1. Fetch on-chain data
  const marketData = await solanaClient.fetchMarketAccount(marketId);
  if (!marketData) {
    // Return a safe "abstain" if market doesn't exist
    const fallbackAnalysis: TradeAnalysis = {
      suggested_side: "abstain",
      suggested_amount: 0,
      confidence: 0,
      reasoning: `Market ${marketId} not found on-chain. It may not exist yet or the RPC connection failed.`,
      risk_score: 1,
    };
    const guardrails = enforceGuardrails(fallbackAnalysis, marketId, userPubkey);
    return {
      analysis: fallbackAnalysis,
      guardrails,
      marketData: null,
      userPosition: null,
      riskMetrics: null,
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Fetch user position
  const userPosition = await solanaClient.fetchUserPosition(marketId, userPubkey);

  // 3. Pre-calculate risk metrics for a hypothetical mid-size bet
  const hypotheticalBet = 5_000_000; // 5 USDC
  const riskMetrics = calculateRiskMetrics(marketData, "yes", hypotheticalBet);

  // 4. Build prompt and call LLM
  const analysisPrompt = buildAnalysisPrompt(marketData, userPosition, riskMetrics);

  const response = await llm.invoke([
    new SystemMessage(ANALYSIS_SYSTEM_PROMPT),
    new HumanMessage(analysisPrompt),
  ]);

  // 5. Parse and validate with Zod
  let analysis: TradeAnalysis;
  try {
    analysis = parseAnalysisOutput(
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content)
    );
  } catch (parseError: any) {
    console.error("Failed to parse AI output:", parseError.message);
    analysis = {
      suggested_side: "abstain",
      suggested_amount: 0,
      confidence: 0,
      reasoning: "AI output could not be parsed into valid trade analysis. Raw output was logged.",
      risk_score: 1,
    };
  }

  // 6. Enforce guardrails
  const guardrails = enforceGuardrails(analysis, marketId, userPubkey);

  // 7. Log everything (async, don't block response)
  const result: AnalysisResult = {
    analysis,
    guardrails,
    marketData,
    userPosition,
    riskMetrics,
    timestamp: new Date().toISOString(),
  };

  logAnalysis(marketId, userPubkey, result).catch((err) =>
    console.error("Failed to log analysis:", err.message)
  );

  return result;
}
