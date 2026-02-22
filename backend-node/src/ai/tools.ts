// @ts-nocheck
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { solanaClient } from "../solana/client.js";
import { TOOL_DESCRIPTIONS } from "./prompts.js";

/**
 * LangChain tools for the BizFi AI agent.
 * Each tool wraps a Solana client method with Zod-validated inputs.
 */

const marketDataSchema: z.ZodTypeAny = z.object({
  market_id: z.number().int().positive().describe("The market ID (u64)"),
});

export const getMarketDataTool = new DynamicStructuredTool({
  name: "get_market_data",
  description: TOOL_DESCRIPTIONS.get_market_data,
  schema: marketDataSchema,
  func: async ({ market_id }: { market_id: number }) => {
    const data = await solanaClient.fetchMarketAccount(market_id);
    if (!data) {
      return JSON.stringify({
        error: "Market not found on-chain",
        market_id,
      });
    }
    return JSON.stringify(data);
  },
});

const userPositionSchema: z.ZodTypeAny = z.object({
  market_id: z.number().int().positive().describe("The market ID (u64)"),
  user_pubkey: z.string().describe("The user's Solana wallet public key (base58)"),
});

export const getUserPositionTool = new DynamicStructuredTool({
  name: "get_user_position",
  description: TOOL_DESCRIPTIONS.get_user_position,
  schema: userPositionSchema,
  func: async ({ market_id, user_pubkey }: { market_id: number; user_pubkey: string }) => {
    const position = await solanaClient.fetchUserPosition(market_id, user_pubkey);
    if (!position) {
      return JSON.stringify({
        has_position: false,
        market_id,
        user_pubkey,
      });
    }
    return JSON.stringify({ has_position: true, ...position });
  },
});

const simulateRiskSchema: z.ZodTypeAny = z.object({
  market_id: z.number().int().positive(),
  bet_side: z.enum(["yes", "no"]),
  bet_amount: z.number().positive().describe("Amount in USDC micro-units (6 decimals)"),
});

export const simulateRiskTool = new DynamicStructuredTool({
  name: "simulate_risk",
  description: TOOL_DESCRIPTIONS.simulate_risk,
  schema: simulateRiskSchema,
  func: async ({
    market_id,
    bet_side,
    bet_amount,
  }: {
    market_id: number;
    bet_side: "yes" | "no";
    bet_amount: number;
  }) => {
    const market = await solanaClient.fetchMarketAccount(market_id);
    if (!market) {
      return JSON.stringify({ error: "Market not found" });
    }

    const { totalPool, yesPool, noPool, yesOdds, noOdds, timeRemaining } = market;

    // Pool after this bet
    const newTotalPool = totalPool + bet_amount;
    const winningPool = bet_side === "yes" ? yesPool + bet_amount : noPool + bet_amount;
    const losingPool = bet_side === "yes" ? noPool : yesPool;

    // Expected payout if win: (your_stake / winning_pool) * total_pool
    const expectedPayout = winningPool > 0
      ? (bet_amount / winningPool) * newTotalPool
      : 0;

    // Expected value = payout * probability - cost
    const impliedProb = bet_side === "yes" ? yesOdds : noOdds;
    const ev = expectedPayout * impliedProb - bet_amount;

    // Kelly criterion: f* = (bp - q) / b
    // b = odds (payout ratio), p = prob of winning, q = 1 - p
    const payoutRatio = expectedPayout / bet_amount - 1;
    const kellyFraction = payoutRatio > 0
      ? Math.max(0, (payoutRatio * impliedProb - (1 - impliedProb)) / payoutRatio)
      : 0;

    // Liquidity impact: how much does this bet move the odds?
    const liquidityImpact = totalPool > 0 ? bet_amount / totalPool : 1;

    // Time decay factor (less time = more uncertainty)
    const hoursRemaining = timeRemaining / 3600;
    const timeRisk = hoursRemaining < 24 ? 0.8 : hoursRemaining < 72 ? 0.5 : 0.2;

    return JSON.stringify({
      expected_payout: Math.round(expectedPayout),
      expected_value: Math.round(ev),
      kelly_optimal_fraction: parseFloat(kellyFraction.toFixed(4)),
      kelly_optimal_amount: Math.round(kellyFraction * 100_000_000), // assuming 100 USDC bankroll
      max_potential_loss: bet_amount,
      liquidity_impact: parseFloat(liquidityImpact.toFixed(4)),
      time_risk_factor: timeRisk,
      implied_probability: parseFloat(impliedProb.toFixed(4)),
      current_odds: { yes: parseFloat(yesOdds.toFixed(4)), no: parseFloat(noOdds.toFixed(4)) },
    });
  },
});

const executeBetSchema: z.ZodTypeAny = z.object({
  market_id: z.number().int().positive(),
  user_pubkey: z.string().describe("User's wallet public key (base58)"),
  user_usdc_ata: z.string().describe("User's USDC associated token account (base58)"),
  amount: z.number().positive().describe("Bet amount in USDC micro-units"),
  bet_on_yes: z.boolean().describe("true = bet YES, false = bet NO"),
});

export const executeBetTool = new DynamicStructuredTool({
  name: "execute_bet",
  description: TOOL_DESCRIPTIONS.execute_bet,
  schema: executeBetSchema,
  func: async ({
    market_id,
    user_pubkey,
    user_usdc_ata,
    amount,
    bet_on_yes,
  }: {
    market_id: number;
    user_pubkey: string;
    user_usdc_ata: string;
    amount: number;
    bet_on_yes: boolean;
  }) => {
    try {
      const result = await solanaClient.buildPlaceBetTransaction(
        market_id,
        user_pubkey,
        user_usdc_ata,
        amount,
        bet_on_yes
      );
      return JSON.stringify({
        success: true,
        message: "Transaction built. User must sign with their wallet.",
        transaction: result.transaction,
        market_address: result.marketAddress,
      });
    } catch (err: any) {
      return JSON.stringify({
        success: false,
        error: err.message,
      });
    }
  },
});

/** All tools available to the AI agent. */
export const agentTools: DynamicStructuredTool[] = [
  getMarketDataTool,
  getUserPositionTool,
  simulateRiskTool,
  executeBetTool,
];
