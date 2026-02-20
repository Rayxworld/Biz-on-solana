import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { solanaClient } from "../solana/client.js";
import { recordTradeExecution } from "../ai/guardrails.js";
import { tradeSubmitRateLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import type {
  PrepareTradeRequest,
  PrepareTradeResponse,
  SubmitTradeRequest,
  SubmitTradeResponse,
} from "../types/trade.js";

const router = Router();

const PrepareTradeSchema = z.object({
  marketId: z.number().int().positive(),
  userPubkey: z.string().min(32).max(44),
  userUsdcAta: z.string().min(32).max(44),
  amount: z.number().int().positive(),
  betOnYes: z.boolean(),
});

const SubmitTradeSchema = z.object({
  signedTransaction: z.string().min(1),
  userPubkey: z.string().min(32).max(44),
  amount: z.number().int().positive().optional(),
});

router.post(
  "/prepare",
  validateBody(PrepareTradeSchema),
  async (req: Request, res: Response) => {
    try {
      const { marketId, userPubkey, userUsdcAta, amount, betOnYes } =
        req.body as PrepareTradeRequest;

      const result = await solanaClient.buildPlaceBetTransaction(
        marketId,
        userPubkey,
        userUsdcAta,
        amount,
        betOnYes
      );

      const response: PrepareTradeResponse = {
        success: true,
        message: "Transaction prepared. Sign with your wallet to execute.",
        transaction: result.transaction,
        marketAddress: result.marketAddress,
      };
      return res.json(response);
    } catch (err: any) {
      console.error("POST /api/trade/prepare error:", err.message);
      return res.status(500).json({ error: "Failed to prepare trade" });
    }
  }
);

router.post(
  "/submit",
  tradeSubmitRateLimiter,
  validateBody(SubmitTradeSchema),
  async (req: Request, res: Response) => {
    try {
      const { signedTransaction, userPubkey } = req.body as SubmitTradeRequest;

      const verification = solanaClient.verifySignedPlaceBetTransaction(
        signedTransaction,
        userPubkey
      );
      if (!verification.ok) {
        return res.status(400).json({
          error: "Signed transaction verification failed",
          reason: verification.reason,
        });
      }

      const signature = await solanaClient.submitSignedTransaction(signedTransaction);
      recordTradeExecution(userPubkey, verification.amount);

      const response: SubmitTradeResponse = {
        success: true,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        verifiedAmount: verification.amount,
      };
      return res.json(response);
    } catch (err: any) {
      console.error("POST /api/trade/submit error:", err.message);
      return res
        .status(500)
        .json({ error: "Transaction submission failed", message: err.message });
    }
  }
);

router.get("/history/:userPubkey", async (req: Request, res: Response) => {
  try {
    const { userPubkey } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const history = await solanaClient.getTransactionHistory(userPubkey as string, limit);
    return res.json({ transactions: history, count: history.length });
  } catch (err: any) {
    console.error("GET /api/trade/history error:", err.message);
    return res.status(500).json({ error: "Failed to fetch trade history" });
  }
});

export default router;
