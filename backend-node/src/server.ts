import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { globalRateLimiter } from "./middleware/rateLimit.js";
import marketsRouter from "./routes/markets.js";
import aiRouter from "./routes/ai.js";
import tradeRouter from "./routes/trade.js";
import statsRouter from "./routes/stats.js";

const app = express();

app.use((cors as any)({ 
  origin: [
    config.corsOrigin, 
    "https://biz-on-solana.vercel.app", 
    /^https:\/\/.*\.vercel\.app$/ // Allow preview deployments
  ], 
  credentials: true 
}));
app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "bizfi-ai-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    config: {
      rpc: config.solanaRpcUrl.includes("helius") ? "helius" : "devnet",
      hasGroq: Boolean(config.groqApiKey),
      hasSupabase: Boolean(config.supabaseUrl && config.supabaseServiceKey),
      hasMarketFeeConfig: Boolean(config.marketFeeCollectorAta),
      idlPath: config.solanaIdlPath,
    },
  });
});

app.use("/api/markets", marketsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/trade", tradeRouter);
app.use("/api/stats", statsRouter);

app.get("/api/program/status", async (_req, res) => {
  try {
    const { solanaClient } = await import("./solana/client.js");
    const status = await solanaClient.getProgramStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/program/startup-check", async (_req, res) => {
  try {
    const { solanaClient } = await import("./solana/client.js");
    const checks = await solanaClient.getStartupChecks();
    res.json(checks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(config.port, () => {
  console.log("BizFi AI backend started");
  console.log(`Port: ${config.port}`);
  console.log(
    `RPC: ${config.solanaRpcUrl.includes("helius") ? "Helius Devnet" : "Solana Devnet"}`
  );
  console.log(`IDL path: ${config.solanaIdlPath}`);
  console.log(`Health: http://localhost:${config.port}/api/health`);
});

export default app;
