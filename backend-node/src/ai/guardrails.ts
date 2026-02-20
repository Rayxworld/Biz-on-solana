import { z } from "zod";
import { guardrailConfig } from "../config/index.js";
import type { GuardrailResult, TradeAnalysis } from "../types/ai.js";

// Zod schema for AI trade analysis output
export const TradeAnalysisSchema = z.object({
  suggested_side: z.enum(["yes", "no", "abstain"]),
  suggested_amount: z.number().min(0),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  risk_score: z.number().min(0).max(1),
});

// In-memory daily risk budget tracker (demo mode)
// In production, use Supabase for persistence across restarts.
const dailyRiskBudgetSpent: Map<string, { total: number; date: string }> = new Map();

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

function getDailyRiskBudgetSpent(userPubkey: string): number {
  const entry = dailyRiskBudgetSpent.get(userPubkey);
  if (!entry || entry.date !== getTodayKey()) return 0;
  return entry.total;
}

function recordRiskBudgetSpend(userPubkey: string, amount: number): void {
  const today = getTodayKey();
  const entry = dailyRiskBudgetSpent.get(userPubkey);
  if (!entry || entry.date !== today) {
    dailyRiskBudgetSpent.set(userPubkey, { total: amount, date: today });
  } else {
    entry.total += amount;
  }
}

/**
 * Validate an AI trade analysis against all guardrails.
 * Returns allowed=true only if all blocking checks pass.
 */
export function enforceGuardrails(
  analysis: TradeAnalysis,
  marketId: number,
  userPubkey: string,
  userBalanceUsdc: number = 100_000_000 // default 100 USDC for demo
): GuardrailResult {
  const reasons: string[] = [];

  if (analysis.confidence < guardrailConfig.confidenceThreshold) {
    reasons.push(
      `Confidence ${(analysis.confidence * 100).toFixed(1)}% is below threshold ${(guardrailConfig.confidenceThreshold * 100).toFixed(1)}%`
    );
  }

  if (analysis.suggested_side === "abstain") {
    reasons.push("AI recommends abstaining from this market");
  }

  const maxAllocation = Math.floor(
    (userBalanceUsdc * guardrailConfig.maxAllocationPercent) / 100
  );
  if (analysis.suggested_amount > maxAllocation) {
    reasons.push(
      `Suggested amount ${analysis.suggested_amount} exceeds max allocation ${maxAllocation} (${guardrailConfig.maxAllocationPercent}% of balance)`
    );
  }

  const currentDailyRiskBudget = getDailyRiskBudgetSpent(userPubkey);
  if (
    currentDailyRiskBudget + analysis.suggested_amount >
    guardrailConfig.dailyRiskBudgetUsdc
  ) {
    reasons.push(
      `Daily risk budget would be exceeded. Current: ${currentDailyRiskBudget}, Proposed: ${analysis.suggested_amount}, Budget: ${guardrailConfig.dailyRiskBudgetUsdc}`
    );
  }

  if (
    guardrailConfig.marketWhitelist.length > 0 &&
    !guardrailConfig.marketWhitelist.includes(marketId)
  ) {
    reasons.push(`Market ${marketId} is not in the whitelist`);
  }

  if (analysis.risk_score > 0.8) {
    reasons.push(
      `WARNING High risk score: ${(analysis.risk_score * 100).toFixed(1)}% - proceed with caution`
    );
  }

  const allowed = reasons.filter((r) => !r.startsWith("WARNING")).length === 0;
  return { allowed, reasons, analysis };
}

/**
 * Record a trade execution for daily risk budget tracking.
 * Call this after a bet is successfully placed.
 */
export function recordTradeExecution(userPubkey: string, amount: number): void {
  recordRiskBudgetSpend(userPubkey, amount);
}

/**
 * Parse and validate raw AI output into TradeAnalysis.
 * Uses Zod for strict schema validation.
 */
export function parseAnalysisOutput(raw: string): TradeAnalysis {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  return TradeAnalysisSchema.parse(parsed) as TradeAnalysis;
}
