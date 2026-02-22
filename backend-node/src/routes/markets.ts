import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { solanaClient, deriveMarketPDA } from "../solana/client.js";
import { validateBody } from "../middleware/validate.js";
import { config } from "../config/index.js";
import { enforceMarketCreationGuardrails } from "../services/marketCreationGuardrails.js";
import { getCreatorMetadata, registerCreatorMetadata } from "../services/creatorRegistry.js";
import { recordCreateMetric } from "../services/metrics.js";

const router = Router();

const PrepareCreateMarketSchema = z.object({
  marketId: z.number().int().positive(),
  creatorPubkey: z.string().min(32).max(44),
  creatorUsdcAta: z.string().min(32).max(44),
  usdcMint: z.string().min(32).max(44),
  question: z.string().min(1).max(256),
  durationSeconds: z.number().int().positive(),
  creatorType: z.enum(["human", "agent"]).default("human"),
  creatorLabel: z.string().max(64).optional(),
  agentId: z.string().max(128).optional(),
});

const SubmitCreateMarketSchema = z.object({
  signedTransaction: z.string().min(1),
  creatorPubkey: z.string().min(32).max(44),
});

const PrecheckCreatorAtaSchema = z.object({
  creatorPubkey: z.string().min(32).max(44),
  creatorUsdcAta: z.string().min(32).max(44),
  usdcMint: z.string().min(32).max(44),
});

router.get("/", async (_req: Request, res: Response) => {
  try {
    const markets = await solanaClient.fetchAllMarkets();
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

router.post(
  "/precheck-creator-ata",
  validateBody(PrecheckCreatorAtaSchema),
  async (req: Request, res: Response) => {
    try {
      const payload = req.body as z.infer<typeof PrecheckCreatorAtaSchema>;
      const check = await solanaClient.precheckUserUsdcAtaForMint({
        userPubkey: payload.creatorPubkey,
        userUsdcAta: payload.creatorUsdcAta,
        expectedMint: payload.usdcMint,
      });

      if (!check.ok) {
        return res.status(400).json({
          ok: false,
          reason: check.reason,
          details: check.details,
        });
      }

      return res.json(check);
    } catch (err: any) {
      console.error("POST /api/markets/precheck-creator-ata error:", err.message);
      return res.status(500).json({ error: "Failed to precheck creator ATA" });
    }
  }
);

router.post(
  "/prepare-create",
  validateBody(PrepareCreateMarketSchema),
  async (req: Request, res: Response) => {
    try {
      const payload = req.body as z.infer<typeof PrepareCreateMarketSchema>;
      if (!config.marketFeeCollectorAta) {
        return res.status(500).json({
          error: "MARKET_FEE_COLLECTOR_ATA is not configured on backend",
        });
      }
      const checks = enforceMarketCreationGuardrails({
        userPubkey: payload.creatorPubkey,
        question: payload.question,
        durationSeconds: payload.durationSeconds,
        creatorType: payload.creatorType,
      });
      if (!checks.allowed) {
        return res.status(400).json({
          error: "Market creation blocked by guardrails",
          reasons: checks.reasons,
        });
      }

      const ataCheck = await solanaClient.precheckUserUsdcAtaForMint({
        userPubkey: payload.creatorPubkey,
        userUsdcAta: payload.creatorUsdcAta,
        expectedMint: payload.usdcMint,
      });
      if (!ataCheck.ok) {
        return res.status(400).json({
          error: "Creator ATA precheck failed",
          reason: ataCheck.reason,
          details: ataCheck.details,
        });
      }

      await registerCreatorMetadata({
        userPubkey: payload.creatorPubkey,
        creatorType: payload.creatorType,
        creatorLabel: payload.creatorLabel,
        agentId: payload.agentId,
      });

      const result = await solanaClient.buildInitializeMarketTransaction({
        marketId: payload.marketId,
        creatorPubkey: payload.creatorPubkey,
        creatorUsdcAta: payload.creatorUsdcAta,
        usdcMint: payload.usdcMint,
        question: payload.question,
        durationSeconds: payload.durationSeconds,
        creationFeeMicroUsdc: config.marketCreationFeeMicroUsdc,
        feeCollectorAta: config.marketFeeCollectorAta,
      });

      return res.json({
        success: true,
        message: "Market create transaction prepared. Sign with your wallet.",
        transaction: result.transaction,
        marketAddress: result.marketAddress,
        fee: {
          amountMicroUsdc: config.marketCreationFeeMicroUsdc,
          collectorAta: config.marketFeeCollectorAta,
        },
      });
    } catch (err: any) {
      console.error("POST /api/markets/prepare-create error:", err.message);
      return res.status(500).json({ error: "Failed to prepare market creation" });
    }
  }
);

router.post(
  "/submit-create",
  validateBody(SubmitCreateMarketSchema),
  async (req: Request, res: Response) => {
    try {
      const { signedTransaction, creatorPubkey } = req.body as z.infer<
        typeof SubmitCreateMarketSchema
      >;
      if (!config.marketFeeCollectorAta) {
        return res.status(500).json({
          error: "MARKET_FEE_COLLECTOR_ATA is not configured on backend",
        });
      }
      const verification = solanaClient.verifySignedInitializeMarketTransaction({
        signedTxBase64: signedTransaction,
        expectedCreatorPubkey: creatorPubkey,
        expectedFeeCollectorAta: config.marketFeeCollectorAta,
        minCreationFeeMicroUsdc: config.marketCreationFeeMicroUsdc,
      });
      if (!verification.ok) {
        return res.status(400).json({
          error: "Signed market creation verification failed",
          reason: verification.reason,
        });
      }

      const signature = await solanaClient.submitSignedTransaction(signedTransaction);
      recordCreateMetric(creatorPubkey, verification.feeAmount);
      return res.json({
        success: true,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        marketAddress: verification.marketAddress,
        creationFeePaid: verification.feeAmount,
      });
    } catch (err: any) {
      console.error("POST /api/markets/submit-create error:", err.message);
      return res.status(500).json({ error: "Failed to submit market creation" });
    }
  }
);

router.get("/creator/:userPubkey", async (req: Request, res: Response) => {
  try {
    const record = await getCreatorMetadata(req.params.userPubkey as string);
    return res.json({ creator: record });
  } catch (err: any) {
    console.error("GET /api/markets/creator/:userPubkey error:", err.message);
    return res.status(500).json({ error: "Failed to fetch creator metadata" });
  }
});

router.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id as string, 10);
    if (isNaN(marketId) || marketId <= 0) {
      return res.status(400).json({ error: "Invalid market ID" });
    }
    const [marketPDA] = deriveMarketPDA(marketId);
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

router.get("/:id/position/:userPubkey", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id as string, 10);
    const userPubkey = req.params.userPubkey as string;
    if (isNaN(marketId) || marketId <= 0) {
      return res.status(400).json({ error: "Invalid market ID" });
    }
    const position = await solanaClient.fetchUserPosition(marketId, userPubkey);
    return res.json({ marketId, userPubkey, position });
  } catch (err: any) {
    console.error("GET /api/markets/:id/position/:userPubkey error:", err.message);
    return res.status(500).json({ error: "Failed to fetch user position" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id as string, 10);
    if (isNaN(marketId) || marketId <= 0) {
      return res.status(400).json({ error: "Invalid market ID" });
    }
    const market = await solanaClient.fetchMarketAccount(marketId);
    if (!market) return res.status(404).json({ error: `Market ${marketId} not found` });
    return res.json(market);
  } catch (err: any) {
    console.error("GET /api/markets/:id error:", err.message);
    return res.status(500).json({ error: "Failed to fetch market" });
  }
});

export default router;
