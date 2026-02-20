import dotenv from "dotenv";
import path from "path";
dotenv.config();

const defaultIdlPath = path.resolve(
  process.cwd(),
  process.env.SOLANA_IDL_PATH || "../contracts/target/idl/bizfi_market.json"
);

export const config = {
  // ── OpenAI ──
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",

  // ── Solana ──
  solanaRpcUrl: process.env.HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`
    : process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  programId: process.env.SOLANA_PROGRAM_ID || "5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr",
  solanaIdlPath: defaultIdlPath,

  // ── Supabase ──
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",

  // ── Server ──
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
} as const;

/**
 * Guardrail configuration — all limits enforced before AI suggestions
 * are forwarded to execution.
 */
export const guardrailConfig = {
  /** Minimum AI confidence to allow a trade suggestion (0–1) */
  confidenceThreshold: 0.65,

  /** Maximum % of user balance allowed per single trade */
  maxAllocationPercent: 10,

  /** Maximum daily risk budget allowed per user (USDC 6-decimal micro-units) */
  dailyRiskBudgetUsdc: 50_000_000, // 50 USDC

  /** Whitelisted market IDs (empty = all allowed) */
  marketWhitelist: [] as number[],
} as const;
