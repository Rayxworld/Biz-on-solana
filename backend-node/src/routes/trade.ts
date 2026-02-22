import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { solanaClient } from "../solana/client.js";
import { recordTradeExecution } from "../ai/guardrails.js";
import { tradeSubmitRateLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import type {
  AtaPrecheckRequest,
  AtaPrecheckResponse,
  PrepareTradeRequest,
  PrepareTradeResponse,
  SubmitTradeRequest,
  SubmitTradeResponse,
} from "../types/trade.js";
import { recordTradeMetric } from "../services/metrics.js";

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

const AtaPrecheckSchema = z.object({
  marketId: z.number().int().positive(),
  userPubkey: z.string().min(32).max(44),
  userUsdcAta: z.string().min(32).max(44),
});

const DeriveAtaSchema = z.object({
  userPubkey: z.string().min(32).max(44),
  mint: z.string().min(32).max(44),
});

const PrepareCreateAtaSchema = z.object({
  userPubkey: z.string().min(32).max(44),
  mint: z.string().min(32).max(44),
});

const SubmitCreateAtaSchema = z.object({
  signedTransaction: z.string().min(1),
  userPubkey: z.string().min(32).max(44),
  mint: z.string().min(32).max(44),
});

router.post(
  "/derive-ata",
  validateBody(DeriveAtaSchema),
  async (req: Request, res: Response) => {
    try {
      const { userPubkey, mint } = req.body as z.infer<typeof DeriveAtaSchema>;
      const ata = solanaClient.deriveAssociatedTokenAddress(userPubkey, mint);
      const parsed = await solanaClient.connection.getParsedAccountInfo(
        new PublicKey(ata),
        "confirmed"
      );
      const parsedData = parsed.value?.data as any;
      const amountUi = parsedData?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      return res.json({ ok: true, ata, exists: Boolean(parsed.value), amountUi });
    } catch (err: any) {
      return res.status(400).json({ ok: false, reason: err?.message || "Failed to derive ATA" });
    }
  }
);

router.post(
  "/prepare-create-ata",
  validateBody(PrepareCreateAtaSchema),
  async (req: Request, res: Response) => {
    try {
      const { userPubkey, mint } = req.body as z.infer<typeof PrepareCreateAtaSchema>;
      const result = await solanaClient.buildCreateAtaTransaction({
        ownerPubkey: userPubkey,
        mint,
      });
      return res.json({
        ok: true,
        transaction: result.transaction,
        ata: result.ata,
        alreadyExists: result.alreadyExists,
      });
    } catch (err: any) {
      return res
        .status(400)
        .json({ ok: false, reason: err?.message || "Failed to prepare ATA create transaction" });
    }
  }
);

router.post(
  "/submit-create-ata",
  validateBody(SubmitCreateAtaSchema),
  async (req: Request, res: Response) => {
    try {
      const { signedTransaction, userPubkey, mint } = req.body as z.infer<
        typeof SubmitCreateAtaSchema
      >;
      const verification = solanaClient.verifySignedCreateAtaTransaction({
        signedTxBase64: signedTransaction,
        expectedUserPubkey: userPubkey,
        expectedMint: mint,
      });
      if (!verification.ok) {
        return res.status(400).json({ ok: false, reason: verification.reason });
      }
      const signature = await solanaClient.submitSignedTransaction(signedTransaction);
      return res.json({
        ok: true,
        signature,
        ata: verification.ata,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ ok: false, reason: err?.message || "Failed to submit ATA creation transaction" });
    }
  }
);

router.post(
  "/precheck-ata",
  validateBody(AtaPrecheckSchema),
  async (req: Request, res: Response) => {
    try {
      const { marketId, userPubkey, userUsdcAta } = req.body as AtaPrecheckRequest;
      const check = await solanaClient.precheckUserUsdcAta(marketId, userPubkey, userUsdcAta);
      const payload: AtaPrecheckResponse = check;
      return res.status(check.ok ? 200 : 400).json(payload);
    } catch (err: any) {
      console.error("POST /api/trade/precheck-ata error:", err.message);
      return res.status(500).json({ ok: false, reason: "ATA precheck failed" });
    }
  }
);

router.post(
  "/prepare",
  validateBody(PrepareTradeSchema),
  async (req: Request, res: Response) => {
    try {
      const { marketId, userPubkey, userUsdcAta, amount, betOnYes } =
        req.body as PrepareTradeRequest;
      const ataCheck = await solanaClient.precheckUserUsdcAta(
        marketId,
        userPubkey,
        userUsdcAta
      );
      if (!ataCheck.ok) {
        return res.status(400).json({
          error: "ATA precheck failed",
          reason: ataCheck.reason,
          details: ataCheck.details,
        });
      }

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
      const ataCheck = await solanaClient.precheckUserUsdcAtaForMarketAddress(
        verification.marketAddress,
        userPubkey,
        verification.userUsdcAta
      );
      if (!ataCheck.ok) {
        return res.status(400).json({
          error: "ATA precheck failed",
          reason: ataCheck.reason,
          details: ataCheck.details,
        });
      }

      const signature = await solanaClient.submitSignedTransaction(signedTransaction);
      recordTradeExecution(userPubkey, verification.amount);
      recordTradeMetric(userPubkey, verification.amount);

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
