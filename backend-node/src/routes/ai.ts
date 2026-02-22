import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { analyzeMarket } from "../ai/agent.js";
import { fetchUserLogs } from "../services/logger.js";
import { aiAnalyzeRateLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { recordAnalysisMetric } from "../services/metrics.js";

const router = Router();

const AnalyzeRequestSchema = z.object({
  marketId: z.number().int().positive(),
  userPubkey: z.string().min(32).max(44),
});

router.post(
  "/analyze",
  aiAnalyzeRateLimiter,
  validateBody(AnalyzeRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { marketId, userPubkey } = req.body as z.infer<typeof AnalyzeRequestSchema>;
      const result = await analyzeMarket(marketId, userPubkey);
      recordAnalysisMetric(userPubkey, marketId);

      return res.json({
        success: true,
        analysis: result.analysis,
        telemetry: result.telemetry,
        observability: result.observability,
        guardrails: {
          allowed: result.guardrails.allowed,
          reasons: result.guardrails.reasons,
        },
        marketData: result.marketData,
        userPosition: result.userPosition,
        riskMetrics: result.riskMetrics,
        timestamp: result.timestamp,
      });
    } catch (err: any) {
      console.error("POST /api/ai/analyze error:", err.message);
      return res.status(500).json({
        error: "AI analysis failed",
        message: err.message,
      });
    }
  }
);

router.get("/logs/:userPubkey", async (req: Request, res: Response) => {
  try {
    const { userPubkey } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const logs = await fetchUserLogs(userPubkey as string, limit);
    return res.json({ logs, count: logs.length });
  } catch (err: any) {
    console.error("GET /api/ai/logs error:", err.message);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
