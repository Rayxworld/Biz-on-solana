import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Transaction } from "@solana/web3.js";
import { ArrowLeft, Clock, DollarSign } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AISuggestionPanel from "../components/AISuggestionPanel";
import ExecutionHistory from "../components/ExecutionHistory";
import type { MarketData, TradeAnalysis } from "../lib/api";
import {
  type AnalysisResponse,
  DEFAULT_USER_USDC_ATA,
  deriveAta,
  fetchMarketUserPosition,
  fetchMarketById,
  fetchMarkets,
  precheckAta,
  prepareCreateAta,
  prepareTrade,
  submitCreateAta,
  submitTrade,
} from "../lib/api";

interface MarketDetailProps {
  walletAddress: string | null;
}

const MarketDetail: React.FC<MarketDetailProps> = ({ walletAddress }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [userUsdcAta, setUserUsdcAta] = useState<string>(
    localStorage.getItem("bizfi_user_usdc_ata") || DEFAULT_USER_USDC_ATA
  );
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [amountUsdc, setAmountUsdc] = useState("1");
  const [statusModal, setStatusModal] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
    explorer?: string;
  } | null>(null);
  const [historyRefreshTick, setHistoryRefreshTick] = useState(0);
  const [ataCheckStatus, setAtaCheckStatus] = useState<{
    ok: boolean;
    message: string;
    extra?: string;
  } | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResponse | null>(null);
  const [userPosition, setUserPosition] = useState<{ yesAmount: number; noAmount: number } | null>(
    null
  );
  const [advancedTradeConfig, setAdvancedTradeConfig] = useState(false);
  const [creatingAta, setCreatingAta] = useState(false);

  const loadMarket = async () => {
    const numericId = parseInt(id || "0", 10);
    if (!numericId) {
      setMarket(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const found = await fetchMarketById(numericId);
      setMarket(found || null);
    } catch {
      try {
        const result = await fetchMarkets();
        const found = result.markets.find((m) => m.marketId === numericId);
        setMarket(found || null);
      } catch {
        setMarket(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarket();
  }, [id]);

  useEffect(() => {
    const loadPosition = async () => {
      if (!walletAddress || !market) {
        setUserPosition(null);
        return;
      }
      try {
        const pos = await fetchMarketUserPosition(market.marketId, walletAddress);
        setUserPosition({
          yesAmount: pos?.yesAmount || 0,
          noAmount: pos?.noAmount || 0,
        });
      } catch {
        setUserPosition(null);
      }
    };
    loadPosition();
  }, [walletAddress, market?.marketId]);

  useEffect(() => {
    const syncAta = async () => {
      if (!walletAddress || !market?.usdcMint) return;
      try {
        const derived = await deriveAta({
          userPubkey: walletAddress,
          mint: market.usdcMint,
        });
        if (derived.ok && derived.ata) {
          setUserUsdcAta(derived.ata);
        }
      } catch {
        // keep current ATA value when derivation fails
      }
    };
    syncAta();
  }, [walletAddress, market?.usdcMint]);

  useEffect(() => {
    const runAtaCheck = async () => {
      if (!walletAddress || !market || !userUsdcAta.trim()) {
        setAtaCheckStatus(null);
        return;
      }
      try {
        const check = await precheckAta({
          marketId: market.marketId,
          userPubkey: walletAddress,
          userUsdcAta: userUsdcAta.trim(),
        });
        setAtaCheckStatus({
          ok: check.ok,
          message: check.ok
            ? `ATA verified. Balance: ${check.details?.amountUi ?? 0} tokens`
            : check.reason || "ATA precheck failed",
          extra: check.details
            ? `Expected mint: ${check.details.expectedMint} | Provided mint: ${check.details.mint}`
            : undefined,
        });
      } catch (err: any) {
        const reason = err?.response?.data?.reason || err?.response?.data?.error || "ATA precheck failed";
        const details = err?.response?.data?.details;
        setAtaCheckStatus({
          ok: false,
          message: reason,
          extra: details
            ? `Expected mint: ${details.expectedMint} | Provided mint: ${details.mint}`
            : undefined,
        });
      }
    };
    const t = setTimeout(runAtaCheck, 250);
    return () => clearTimeout(t);
  }, [walletAddress, market, userUsdcAta]);

  const handleCreateAta = async () => {
    if (!walletAddress || !market) {
      setStatusModal({
        type: "error",
        title: "Wallet Not Connected",
        message: "Connect wallet and open a valid market first.",
      });
      return;
    }
    if (!window.solana?.signTransaction) {
      setStatusModal({
        type: "error",
        title: "Phantom Not Available",
        message: "Phantom signing API is not available in this browser session.",
      });
      return;
    }
    try {
      setCreatingAta(true);
      const prep = await prepareCreateAta({
        userPubkey: walletAddress,
        mint: market.usdcMint,
      });
      if (!prep.ok) {
        throw new Error(prep.reason || "Failed to prepare ATA creation");
      }
      if (prep.alreadyExists && prep.ata) {
        setUserUsdcAta(prep.ata);
        setStatusModal({
          type: "success",
          title: "ATA Ready",
          message: "Your ATA already exists for this mint.",
        });
        return;
      }
      if (!prep.transaction) {
        throw new Error("Missing ATA creation transaction payload");
      }

      const unsignedTx = Transaction.from(base64ToUint8Array(prep.transaction));
      const signedTx = await window.solana.signTransaction(unsignedTx);
      const signedBase64 = uint8ArrayToBase64(signedTx.serialize());

      const submit = await submitCreateAta({
        signedTransaction: signedBase64,
        userPubkey: walletAddress,
        mint: market.usdcMint,
      });
      if (!submit.ok) {
        throw new Error(submit.reason || "Failed to submit ATA creation");
      }
      if (submit.ata) setUserUsdcAta(submit.ata);
      setStatusModal({
        type: "success",
        title: "ATA Created",
        message: submit.signature || "ATA created successfully.",
        explorer: submit.explorer,
      });
    } catch (err: any) {
      setStatusModal({
        type: "error",
        title: "ATA Creation Failed",
        message:
          err?.response?.data?.reason ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to create ATA.",
      });
    } finally {
      setCreatingAta(false);
    }
  };

  const handleExecute = (analysis: TradeAnalysis) => {
    const suggested = analysis.suggested_side === "abstain" ? "yes" : analysis.suggested_side;
    setSelectedSide(suggested);
    setAmountUsdc(((analysis.suggested_amount || 1_000_000) / 1_000_000).toFixed(2));
    setTradeModalOpen(true);
  };

  const submitExecution = async () => {
    if (!walletAddress || !market) {
      setStatusModal({
        type: "error",
        title: "Wallet Not Connected",
        message: "Connect wallet and open a valid market first.",
      });
      return;
    }
    if (!window.solana?.signTransaction) {
      setStatusModal({
        type: "error",
        title: "Phantom Not Available",
        message: "Phantom signing API is not available in this browser session.",
      });
      return;
    }
    if (!userUsdcAta.trim()) {
      setStatusModal({
        type: "error",
        title: "USDC ATA Required",
        message: "Enter your USDC ATA before executing a trade.",
      });
      return;
    }

    const parsedAmount = Number(amountUsdc);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatusModal({
        type: "error",
        title: "Invalid Amount",
        message: "Enter a valid USDC amount greater than 0.",
      });
      return;
    }

    const amount = Math.floor(parsedAmount * 1_000_000);
    const betOnYes = selectedSide === "yes";

    try {
      setExecuting(true);
      setTradeModalOpen(false);
      localStorage.setItem("bizfi_user_usdc_ata", userUsdcAta.trim());

      const prepared = await prepareTrade({
        marketId: market.marketId,
        userPubkey: walletAddress,
        userUsdcAta: userUsdcAta.trim(),
        amount,
        betOnYes,
      });

      const unsignedTx = Transaction.from(base64ToUint8Array(prepared.transaction));
      const signedTx = await window.solana.signTransaction(unsignedTx);
      const signedBase64 = uint8ArrayToBase64(signedTx.serialize());

      const submitResult = await submitTrade({
        signedTransaction: signedBase64,
        userPubkey: walletAddress,
      });

      setStatusModal({
        type: "success",
        title: "Trade Submitted",
        message: submitResult.signature,
        explorer: submitResult.explorer,
      });
      setHistoryRefreshTick((n) => n + 1);
      await loadMarket();
      const pos = await fetchMarketUserPosition(market.marketId, walletAddress);
      setUserPosition({
        yesAmount: pos?.yesAmount || 0,
        noAmount: pos?.noAmount || 0,
      });
    } catch (err: any) {
      setStatusModal({
        type: "error",
        title: "Execution Failed",
        message:
          err?.response?.data?.reason ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to execute trade.",
      });
    } finally {
      setExecuting(false);
    }
  };

  const formatUsdc = (microUnits: number) =>
    (microUnits / 1_000_000).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatTimeRemaining = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400">Market not found</p>
        <button
          onClick={() => navigate("/markets")}
          className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
        >
          Back to Markets
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/markets")}
        className="flex items-center gap-2 text-xs text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Markets
      </button>

      <div className="rounded-2xl border border-white/10 bg-[#121a23]/80 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span
              className={`mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                market.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400"
              }`}
            >
              {market.isActive ? "Active" : "Ended"}
            </span>
            <h1 className="mt-2 font-['Space_Grotesk'] text-lg font-bold text-white">{market.question}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
              <DollarSign className="h-3 w-3" />
              Total Pool
            </div>
            <p className="mt-1 text-sm font-bold text-white">{formatUsdc(market.totalPool)} USDC</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
              <Clock className="h-3 w-3" />
              Time Left
            </div>
            <p className="mt-1 text-sm font-bold text-white">{formatTimeRemaining(market.timeRemaining)}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3">
            <div className="text-[10px] uppercase tracking-widest text-emerald-500">Yes</div>
            <p className="mt-1 text-sm font-bold text-emerald-300">{(market.yesOdds * 100).toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500">{formatUsdc(market.yesPool)} USDC</p>
          </div>
          <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3">
            <div className="text-[10px] uppercase tracking-widest text-red-500">No</div>
            <p className="mt-1 text-sm font-bold text-red-300">{(market.noOdds * 100).toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500">{formatUsdc(market.noPool)} USDC</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${market.yesOdds * 100}%` }} />
            <div className="bg-red-500 transition-all duration-700" style={{ width: `${market.noOdds * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AISuggestionPanel
          marketId={market.marketId}
          walletAddress={walletAddress}
          onExecute={handleExecute}
          onAnalysis={(result) => setLatestAnalysis(result)}
        />
        <ExecutionHistory walletAddress={walletAddress} refreshTrigger={historyRefreshTick} />
      </div>

      <AnimatePresence>
        {(latestAnalysis || userPosition) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-white/10 bg-[#101824]/70 p-4"
          >
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Position Overview</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Your YES" value={`${((userPosition?.yesAmount || latestAnalysis?.userPosition?.yesAmount || 0) / 1_000_000).toFixed(2)} USDC`} />
            <Metric label="Your NO" value={`${((userPosition?.noAmount || latestAnalysis?.userPosition?.noAmount || 0) / 1_000_000).toFixed(2)} USDC`} />
            <Metric
              label="Last AI Side"
              value={(latestAnalysis?.analysis.suggested_side || "abstain").toUpperCase()}
            />
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          Wallet Trade Config
        </div>
        <div className="mb-2 text-[11px] text-slate-500">
          Market mint: <span className="text-slate-300">{market.usdcMint}</span>
        </div>
        <label className="mb-2 block text-[11px] text-slate-400">USDC ATA (for this market mint)</label>
        <input
          value={userUsdcAta}
          onChange={(e) => setUserUsdcAta(e.target.value)}
          placeholder="Paste your USDC ATA"
          disabled={!advancedTradeConfig}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-400/50 disabled:opacity-70"
        />
        <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={advancedTradeConfig}
              onChange={(e) => setAdvancedTradeConfig(e.target.checked)}
            />
            Advanced config (manual ATA)
          </label>
          <button
            onClick={handleCreateAta}
            disabled={creatingAta}
            className="rounded-lg border border-emerald-400/30 px-2.5 py-1 text-[11px] text-emerald-200 disabled:opacity-60"
          >
            {creatingAta ? "Creating..." : "Create ATA"}
          </button>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("bizfi_user_usdc_ata");
            localStorage.removeItem("bizfi_market_mint");
            setUserUsdcAta(DEFAULT_USER_USDC_ATA);
            setAtaCheckStatus(null);
            setUserPosition(null);
            setStatusModal({
              type: "success",
              title: "Cache Reset",
              message: "Cleared cached ATA/mint values.",
            });
          }}
          className="mt-2 rounded-xl border border-white/10 px-3 py-1.5 text-[11px] text-slate-400"
        >
          Reset Cached ATA/Mint
        </button>
        {ataCheckStatus && (
          <div
            className={`mt-2 text-xs ${
              ataCheckStatus.ok ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {ataCheckStatus.message}
            {ataCheckStatus.extra && (
              <div className="mt-1 break-all text-[11px] text-slate-400">{ataCheckStatus.extra}</div>
            )}
          </div>
        )}
      </div>

      {executing && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-white/10 bg-[#121a23] px-4 py-2 text-xs text-slate-200">
          Preparing and signing transaction...
        </div>
      )}

      <AnimatePresence>
        {tradeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101824] p-5"
            >
            <div className="mb-3 text-sm font-semibold text-white">Execute Trade</div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">Side</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedSide("yes")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      selectedSide === "yes"
                        ? "bg-emerald-500/80 text-white"
                        : "bg-white/5 text-slate-300"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setSelectedSide("no")}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      selectedSide === "no"
                        ? "bg-rose-500/80 text-white"
                        : "bg-white/5 text-slate-300"
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Amount (USDC)
                </label>
                <input
                  value={amountUsdc}
                  onChange={(e) => setAmountUsdc(e.target.value)}
                  min={0.01}
                  step="0.01"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-400/50"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Allowed range: 0.01 to 100 USDC
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTradeModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submitExecution}
                  disabled={
                    executing ||
                    !ataCheckStatus?.ok ||
                    !Number.isFinite(Number(amountUsdc)) ||
                    Number(amountUsdc) < 0.01 ||
                    Number(amountUsdc) > 100
                  }
                  className="flex-1 rounded-xl bg-emerald-500/80 px-3 py-2 text-xs font-semibold text-white"
                >
                  Confirm & Sign
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101824] p-5"
            >
            <div
              className={`mb-2 text-sm font-semibold ${
                statusModal.type === "success" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {statusModal.title}
            </div>
            <p className="break-all text-xs text-slate-300">{statusModal.message}</p>
            {statusModal.explorer && (
              <a
                href={statusModal.explorer}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs text-emerald-300 hover:text-emerald-200"
              >
                Open in Solana Explorer
              </a>
            )}
            <div className="mt-4">
              <button
                onClick={() => setStatusModal(null)}
                className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200"
              >
                OK
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketDetail;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
