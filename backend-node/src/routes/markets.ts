import { Router, Request, Response } from "express";
import { solanaClient } from "../solana/client.js";

const router = Router();

// ── GET /api/markets ──
router.get("/", async (_req: Request, res: Response) => {
  try {
    const markets = await solanaClient.fetchAllMarkets();

    // If no on-chain markets exist yet, return demo data
    if (markets.length === 0) {
      return res.json({
        source: "demo",
        markets: [
          {
            address: "demo_1",
            marketId: 1,
            question: "Will this project reach 50k Twitter followers in 90 days?",
            totalPool: 2_405_000_000,
            yesPool: 1_611_000_000,
            noPool: 794_000_000,
            yesOdds: 0.67,
            noOdds: 0.33,
            isActive: true,
            timeRemaining: 1_209_600,
            endTime: Math.floor(Date.now() / 1000) + 1_209_600,
            creator: "demo",
            outcome: false,
          },
          {
            address: "demo_2",
            marketId: 2,
            question: "Will this SaaS hit $3k MRR in 30 days?",
            totalPool: 1_120_000_000,
            yesPool: 470_000_000,
            noPool: 650_000_000,
            yesOdds: 0.42,
            noOdds: 0.58,
            isActive: true,
            timeRemaining: 604_800,
            endTime: Math.floor(Date.now() / 1000) + 604_800,
            creator: "demo",
            outcome: false,
          },
          {
            address: "demo_3",
            marketId: 3,
            question: "Will the MVP ship before Q2 2026?",
            totalPool: 890_000_000,
            yesPool: 694_000_000,
            noPool: 196_000_000,
            yesOdds: 0.78,
            noOdds: 0.22,
            isActive: true,
            timeRemaining: 1_814_400,
            endTime: Math.floor(Date.now() / 1000) + 1_814_400,
            creator: "demo",
            outcome: false,
          },
        ],
      });
    }

    return res.json({ source: "on-chain", markets });
  } catch (err: any) {
    console.error("GET /api/markets error:", err.message);
    return res.status(500).json({ error: "Failed to fetch markets" });
  }
});

// ── GET /api/markets/:id ──
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id as string, 10);
    if (isNaN(marketId) || marketId <= 0) {
      return res.status(400).json({ error: "Invalid market ID" });
    }

    const market = await solanaClient.fetchMarketAccount(marketId);
    if (!market) {
      return res.status(404).json({ error: `Market ${marketId} not found` });
    }

    return res.json(market);
  } catch (err: any) {
    console.error("GET /api/markets/:id error:", err.message);
    return res.status(500).json({ error: "Failed to fetch market" });
  }
});

// ── GET /api/markets/:id/history ──
router.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id as string, 10);
    if (isNaN(marketId) || marketId <= 0) {
      return res.status(400).json({ error: "Invalid market ID" });
    }

    const [marketPDA] = (await import("../solana/client.js")).deriveMarketPDA(marketId);
    const history = await solanaClient.getTransactionHistory(
      marketPDA.toBase58(),
      parseInt(req.query.limit as string, 10) || 20
    );

    return res.json({ marketId, transactions: history });
  } catch (err: any) {
    console.error("GET /api/markets/:id/history error:", err.message);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
