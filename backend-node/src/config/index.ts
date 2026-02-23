import dotenv from "dotenv";
import path from "path";

dotenv.config();

import fs from "fs";

function resolveIdlPath(): string {
  const possiblePaths: string[] = [];

  if (process.env.SOLANA_IDL_PATH) {
    const rawPath = path.resolve(process.cwd(), process.env.SOLANA_IDL_PATH);
    possiblePaths.push(rawPath);
    possiblePaths.push(path.join(rawPath, "idl.json"));
    possiblePaths.push(path.join(rawPath, "src", "idl", "idl.json"));
  }

  // Append standard project fallback structures
  possiblePaths.push(path.resolve(process.cwd(), "src/idl/idl.json"));
  possiblePaths.push(path.resolve(process.cwd(), "idl.json"));
  possiblePaths.push(path.resolve(process.cwd(), "../contracts/target/idl/bizfi_market.json"));

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    } catch (e) {
      // Ignore stat errors for paths that don't exist
    }
  }

  // If nothing is found, fall back to the first possible raw path so the error makes sense.
  return possiblePaths[0] || "idl.json";
}

const defaultIdlPath = resolveIdlPath();

export const config = {
  // LLM (Groq via OpenAI-compatible API)
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",

  // Solana
  solanaRpcUrl: process.env.HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`
    : process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  heliusApiKey: process.env.HELIUS_API_KEY || "",
  programId:
    process.env.SOLANA_PROGRAM_ID || "5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr",
  solanaIdlPath: defaultIdlPath,
  marketCreationFeeMicroUsdc: parseInt(
    process.env.MARKET_CREATION_FEE_MICROUSDC || "1000000",
    10
  ),
  marketFeeCollector: process.env.MARKET_FEE_COLLECTOR || "7y9uSgEw24H4E5wJQnF6uYf3pSjXQxV6rT9qWz2H8m9q", // Dummy wallet fallback if missing on Railway

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",

  // Server
  port: parseInt(process.env.PORT || "3001", 10),
  corsOrigin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(",") 
    : "http://localhost:5173",
} as const;

/**
 * Guardrail configuration: all limits are enforced before AI suggestions
 * are forwarded to execution.
 */
export const guardrailConfig = {
  // Minimum AI confidence to allow a trade suggestion (0-1)
  confidenceThreshold: 0.65,

  // Maximum % of user balance allowed per single trade
  maxAllocationPercent: 10,

  // Maximum daily risk budget allowed per user (USDC 6-decimal micro-units)
  dailyRiskBudgetUsdc: 50_000_000, // 50 USDC

  // Whitelisted market IDs (empty = all allowed)
  marketWhitelist: [] as number[],
} as const;
