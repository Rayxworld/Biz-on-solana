import { Router, type Request, type Response } from "express";
import { solanaClient } from "../solana/client.js";
import { getCreatorActivity, getMetricsSnapshot } from "../services/metrics.js";

const router = Router();

router.get("/overview", async (_req: Request, res: Response) => {
  try {
    const markets = await solanaClient.fetchAllMarkets();
    const metrics = getMetricsSnapshot();
    const totalPoolMicroUsdc = markets.reduce((sum, m) => sum + m.totalPool, 0);
    const activeMarkets = markets.filter((m) => m.isActive).length;

    return res.json({
      totalMarkets: markets.length,
      activeMarkets,
      totalPoolMicroUsdc,
      totalPoolUsdc: Number((totalPoolMicroUsdc / 1_000_000).toFixed(2)),
      totalTrades: metrics.totalTrades,
      totalTradeVolumeMicroUsdc: metrics.totalTradeVolumeMicroUsdc,
      totalCreationFeesMicroUsdc: metrics.totalCreationFeesMicroUsdc,
      totalAnalyses: metrics.totalAnalyses,
      feeCollector: config.marketFeeCollector,
    });
  } catch (err: any) {
    console.error("GET /api/stats/overview error:", err.message);
    return res.status(500).json({ error: "Failed to fetch overview stats" });
  }
});

router.get("/leaderboard/markets", async (_req: Request, res: Response) => {
  try {
    const markets = await solanaClient.fetchAllMarkets();
    const topByLiquidity = [...markets]
      .sort((a, b) => b.totalPool - a.totalPool)
      .slice(0, 10)
      .map((m) => ({
        marketId: m.marketId,
        question: m.question,
        totalPool: m.totalPool,
        yesOdds: m.yesOdds,
        noOdds: m.noOdds,
        creator: m.creator,
      }));

    return res.json({ markets: topByLiquidity });
  } catch (err: any) {
    console.error("GET /api/stats/leaderboard/markets error:", err.message);
    return res.status(500).json({ error: "Failed to fetch market leaderboard" });
  }
});

router.get("/leaderboard/creators", async (_req: Request, res: Response) => {
  try {
    const markets = await solanaClient.fetchAllMarkets();
    const byCreator = new Map<string, { marketsCreated: number; totalPool: number }>();
    for (const m of markets) {
      const prev = byCreator.get(m.creator) || { marketsCreated: 0, totalPool: 0 };
      prev.marketsCreated += 1;
      prev.totalPool += m.totalPool;
      byCreator.set(m.creator, prev);
    }

    const onChainCreators = Array.from(byCreator.entries()).map(([creator, stats]) => ({
      creator,
      marketsCreated: stats.marketsCreated,
      totalPool: stats.totalPool,
    }));

    const createActivity = getCreatorActivity();
    const activityMap = new Map(createActivity.map((a) => [a.creatorPubkey, a]));

    const merged = onChainCreators
      .map((c) => {
        const activity = activityMap.get(c.creator);
        return {
          creator: c.creator,
          marketsCreated: c.marketsCreated,
          totalPool: c.totalPool,
          createTxCount: activity?.creates || 0,
          feesPaidMicroUsdc: activity?.feesPaidMicroUsdc || 0,
        };
      })
      .sort((a, b) => b.totalPool - a.totalPool || b.marketsCreated - a.marketsCreated)
      .slice(0, 10);

    return res.json({ creators: merged });
  } catch (err: any) {
    console.error("GET /api/stats/leaderboard/creators error:", err.message);
    return res.status(500).json({ error: "Failed to fetch creator leaderboard" });
  }
});

export default router;

