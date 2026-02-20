/**
 * Structured prompts for BizFi AI agent.
 * The system prompt enforces structured JSON output with Zod-validated schema.
 */

export const ANALYSIS_SYSTEM_PROMPT = `You are BizFi AI, a professional prediction market analyst on Solana.

Your job:
1. Analyze on-chain market data (question, liquidity pools, odds, time remaining)
2. Consider the user's current position (if any)
3. Evaluate risk using quantitative methods
4. Return a structured trade suggestion

RULES:
- Be conservative. Only suggest trades when you have genuine conviction.
- Always explain your reasoning clearly.
- Factor in liquidity depth — thin markets are riskier.
- Consider time remaining — markets closing soon may have less upside.
- Never suggest amounts exceeding the user's balance constraints.
- If market data looks suspicious or insufficient, say so in reasoning.

You MUST respond with ONLY a JSON object in this exact format:
{
  "suggested_side": "yes" | "no" | "abstain",
  "suggested_amount": <number in USDC micro-units, 6 decimals>,
  "confidence": <number 0 to 1>,
  "reasoning": "<detailed explanation of your analysis>",
  "risk_score": <number 0 to 1, where 1 is highest risk>
}

If you recommend "abstain", set suggested_amount to 0 and explain why in reasoning.`;

export const TOOL_DESCRIPTIONS = {
  get_market_data:
    "Fetch on-chain prediction market data from Solana. Returns: question, yes/no pool sizes, odds, total liquidity, time remaining, and market status.",

  get_user_position:
    "Fetch the user's current position in a specific market. Returns: yes_amount, no_amount, and whether winnings have been claimed.",

  simulate_risk:
    "Calculate quantitative risk metrics for a potential trade. Returns: expected value, Kelly criterion optimal bet size, max potential loss, liquidity impact.",

  execute_bet:
    "Build an unsigned place_bet transaction for the user to sign. Does NOT execute automatically — user must approve and sign with their wallet.",
};

export function buildAnalysisPrompt(
  marketData: any,
  userPosition: any,
  riskMetrics: any
): string {
  const parts = [
    "Analyze this prediction market and provide your trade suggestion.",
    "",
    "MARKET DATA:",
    JSON.stringify(marketData, null, 2),
    "",
    "USER CURRENT POSITION:",
    userPosition ? JSON.stringify(userPosition, null, 2) : "No existing position",
    "",
    "RISK METRICS:",
    riskMetrics ? JSON.stringify(riskMetrics, null, 2) : "Not yet calculated",
    "",
    "Provide your analysis as a structured JSON response.",
  ];
  return parts.join("\n");
}

export const GUARDRAIL_REJECTION_PROMPT =
  "The AI suggested a trade but it was blocked by guardrails. Explain to the user clearly why the trade was not executed and what they can do.";
