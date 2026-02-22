import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction } from "@solana/web3.js";
import { Activity, Brain, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from "framer-motion";
import {
  type CreatorLeaderboardEntry,
  DEFAULT_MARKET_MINT,
  DEFAULT_USER_USDC_ATA,
  fetchCreatorLeaderboard,
  fetchMarketLeaderboard,
  fetchMarkets,
  fetchOverviewStats,
  type MarketLeaderboardEntry,
  type OverviewStats,
  precheckCreatorAta,
  prepareCreateMarket,
  submitCreateMarket,
  type MarketData,
} from '../lib/api';

const Markets: React.FC = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createQuestion, setCreateQuestion] = useState("");
  const [createDurationDays, setCreateDurationDays] = useState("7");
  const [createMint, setCreateMint] = useState(
    localStorage.getItem("bizfi_market_mint") || DEFAULT_MARKET_MINT
  );
  const [createAta, setCreateAta] = useState(
    localStorage.getItem("bizfi_user_usdc_ata") || DEFAULT_USER_USDC_ATA
  );
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [marketLeaderboard, setMarketLeaderboard] = useState<MarketLeaderboardEntry[]>([]);
  const [creatorLeaderboard, setCreatorLeaderboard] = useState<CreatorLeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'markets' | 'creators'>('markets');

  const walletAddress = window.solana?.publicKey?.toString?.() || null;

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      const [marketsRes, overview, topMarkets, topCreators] = await Promise.all([
        fetchMarkets(),
        fetchOverviewStats().catch(() => null),
        fetchMarketLeaderboard().catch(() => []),
        fetchCreatorLeaderboard().catch(() => []),
      ]);
      setMarkets(marketsRes.markets);
      setOverviewStats(overview);
      setMarketLeaderboard(topMarkets);
      setCreatorLeaderboard(topCreators);
    } catch {
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarket = async () => {
    if (!walletAddress) {
      setCreateStatus("Connect wallet first.");
      return;
    }
    if (!createQuestion.trim()) {
      setCreateStatus("Enter a market question.");
      return;
    }
    if (!createAta.trim()) {
      setCreateStatus("Enter your USDC ATA.");
      return;
    }
    if (!createMint.trim()) {
      setCreateStatus("Enter market mint.");
      return;
    }
    if (!window.solana?.signTransaction) {
      setCreateStatus("Phantom signing API not available.");
      return;
    }

    const days = Number(createDurationDays);
    if (!Number.isFinite(days) || days <= 0 || days > 30) {
      setCreateStatus("Duration must be between 1 and 30 days.");
      return;
    }

    try {
      setCreating(true);
      setCreateStatus("Checking ATA...");
      localStorage.setItem("bizfi_user_usdc_ata", createAta.trim());
      localStorage.setItem("bizfi_market_mint", createMint.trim());

      const createAtaCheck = await precheckCreatorAta({
        creatorPubkey: walletAddress,
        creatorUsdcAta: createAta.trim(),
        usdcMint: createMint.trim(),
      });
      if (!createAtaCheck.ok) {
        throw new Error(createAtaCheck.reason || "Creator ATA precheck failed");
      }

      const marketId = Math.floor(Date.now() / 1000);
      setCreateStatus("Preparing create transaction...");
      const prep = await prepareCreateMarket({
        marketId,
        creatorPubkey: walletAddress,
        creatorUsdcAta: createAta.trim(),
        usdcMint: createMint.trim(),
        question: createQuestion.trim(),
        durationSeconds: Math.floor(days * 86400),
        creatorType: "agent",
        creatorLabel: "BizFi UI Creator",
      });

      const unsignedTx = Transaction.from(base64ToUint8Array(prep.transaction));
      setCreateStatus("Sign in Phantom...");
      const signedTx = await window.solana.signTransaction(unsignedTx);
      const signedBase64 = uint8ArrayToBase64(signedTx.serialize());

      setCreateStatus("Submitting market creation...");
      const submit = await submitCreateMarket({
        signedTransaction: signedBase64,
        creatorPubkey: walletAddress,
      });

      setCreateStatus(`Market created. ID ${marketId}.`);
      window.open(submit.explorer, "_blank");
      setCreateOpen(false);
      setCreateQuestion("");
      loadMarkets();
    } catch (err: any) {
      const reasons: string[] = err?.response?.data?.reasons || [];
      setCreateStatus(
        reasons.length > 0
          ? `Blocked: ${reasons.join(" | ")}`
          : err?.response?.data?.reason ||
            err?.response?.data?.error ||
          err?.message ||
          "Failed to create market."
      );
    } finally {
      setCreating(false);
    }
  };

  const formatUsdc = (micro: number) =>
    (micro / 1_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const formatTimeRemaining = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    if (days > 0) return `${days}d left`;
    const hours = Math.floor(seconds / 3600);
    return `${hours}h left`;
  };

  const creationHints = buildCreationHints(createQuestion, createDurationDays);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Markets</div>
          <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold text-white">Live Prediction Markets</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
          <Activity size={16} className="text-emerald-300" />
          Helius live feed
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:bg-emerald-500/20"
        >
          Create Market
        </button>
      </div>

      {overviewStats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Markets" value={String(overviewStats.totalMarkets)} />
          <StatCard label="Active Markets" value={String(overviewStats.activeMarkets)} />
          <StatCard
            label="Total Pool"
            value={`${overviewStats.totalPoolUsdc.toLocaleString()} USDC`}
          />
          <StatCard label="AI Analyses" value={String(overviewStats.totalAnalyses)} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 lg:grid-cols-2">
            {markets.map((m) => {
              const yPct = Math.round(m.yesOdds * 100);
              const nPct = Math.round(m.noOdds * 100);

              return (
                <motion.div
                  key={m.marketId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="group cursor-pointer rounded-2xl border border-white/10 bg-[#121a23]/80 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)] transition hover:border-emerald-400/30 hover:bg-[#121a23]"
                  onClick={() => navigate(`/markets/${m.marketId}`)}
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      Market #{m.marketId}
                    </span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">
                      {formatTimeRemaining(m.timeRemaining)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-200">"{m.question}"</p>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-300">YES {yPct}%</span>
                      <span className="text-rose-300">NO {nPct}%</span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-900/70">
                      <div className="bg-emerald-400 transition-all" style={{ width: `${yPct}%` }} />
                      <div className="bg-rose-400 transition-all" style={{ width: `${nPct}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>Pool: {formatUsdc(m.totalPool)} USDC</span>
                    <div className="flex items-center gap-3">
                      <button
                        className="flex items-center gap-1.5 rounded-md border border-emerald-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200 hover:bg-emerald-400/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/markets/${m.marketId}`);
                        }}
                      >
                        <Brain className="h-3 w-3" />
                        AI Analyze
                      </button>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-emerald-300" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-[#0f1620]/80 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-400">
              Leaderboard
            </div>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
              <button
                onClick={() => setLeaderboardTab("markets")}
                className={`rounded-md px-2 py-1 text-[11px] transition ${
                  leaderboardTab === "markets" ? "bg-white/10 text-white" : "text-slate-400"
                }`}
              >
                Markets
              </button>
              <button
                onClick={() => setLeaderboardTab("creators")}
                className={`rounded-md px-2 py-1 text-[11px] transition ${
                  leaderboardTab === "creators" ? "bg-white/10 text-white" : "text-slate-400"
                }`}
              >
                Creators
              </button>
            </div>
            <div className="space-y-2">
              {leaderboardTab === "markets" &&
                marketLeaderboard.map((m, index) => (
                  <button
                    key={m.marketId}
                    onClick={() => navigate(`/markets/${m.marketId}`)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-emerald-400/30"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>#{index + 1} Market {m.marketId}</span>
                      <span>{formatUsdc(m.totalPool)} USDC</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-200">{m.question}</div>
                  </button>
                ))}
              {leaderboardTab === "creators" &&
                creatorLeaderboard.map((c, index) => (
                  <div
                    key={c.creator}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>#{index + 1} {short(c.creator)}</span>
                      <span>{formatUsdc(c.totalPool)} USDC</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-300">
                      {c.marketsCreated} markets | {c.createTxCount} create tx
                    </div>
                  </div>
                ))}
              {((leaderboardTab === "markets" && marketLeaderboard.length === 0) ||
                (leaderboardTab === "creators" && creatorLeaderboard.length === 0)) && (
                <div className="rounded-xl border border-white/10 p-3 text-xs text-slate-500">
                  No markets yet.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101824] p-5"
            >
            <div className="mb-3 text-sm font-semibold text-white">Create Market</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Question</label>
                <input
                  value={createQuestion}
                  onChange={(e) => setCreateQuestion(e.target.value)}
                  placeholder="Will ... ?"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Duration (days)</label>
                  <input
                    value={createDurationDays}
                    onChange={(e) => setCreateDurationDays(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Market Mint</label>
                  <input
                    value={createMint}
                    onChange={(e) => setCreateMint(e.target.value)}
                    placeholder="EVcDM3..."
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Creator USDC ATA</label>
                <input
                  value={createAta}
                  onChange={(e) => setCreateAta(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Creation Guardrail Preview
                </div>
                <ul className="space-y-1 text-[11px]">
                  {creationHints.map((hint) => (
                    <li key={hint.label} className={hint.ok ? "text-emerald-300" : "text-amber-300"}>
                      {hint.ok ? "PASS" : "CHECK"} {hint.label}
                    </li>
                  ))}
                </ul>
              </div>
              {createStatus && <p className="text-xs text-slate-300">{createStatus}</p>}
              <p className="text-[11px] text-slate-500">
                Tip: keep one active mint/ATA pair across create and trading to avoid mismatch errors.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("bizfi_user_usdc_ata");
                    localStorage.removeItem("bizfi_market_mint");
                    setCreateAta(DEFAULT_USER_USDC_ATA);
                    setCreateMint(DEFAULT_MARKET_MINT);
                    setCreateStatus("Cleared cached mint/ATA values.");
                  }}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400"
                >
                  Reset Cache
                </button>
                <button
                  onClick={handleCreateMarket}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-emerald-500/80 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {creating ? "Processing..." : "Create & Sign"}
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Markets;

function short(value: string): string {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function buildCreationHints(question: string, durationDays: string): Array<{ label: string; ok: boolean }> {
  const q = question.trim();
  const days = Number(durationDays);
  return [
    { label: "Starts with 'Will'", ok: /^will\s/i.test(q) },
    { label: "Ends with '?'", ok: q.endsWith("?") },
    { label: "Length between 15 and 220", ok: q.length >= 15 && q.length <= 220 },
    { label: "Duration between 1 and 30 days", ok: Number.isFinite(days) && days >= 1 && days <= 30 },
    { label: "No URLs in question", ok: !/https?:\/\//i.test(q) },
  ];
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
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
