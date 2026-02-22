import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, ShieldCheck, Zap, CandlestickChart, Bot } from "lucide-react";
import { fetchOverviewStats, type OverviewStats } from "../lib/api";
import { motion } from "framer-motion";

const Home: React.FC = () => {
  const [stats, setStats] = React.useState<OverviewStats | null>(null);

  React.useEffect(() => {
    fetchOverviewStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <section className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1724] via-[#101b2a] to-[#0a111c] p-8 md:p-10"
      >
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative grid gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
              <Bot className="h-3.5 w-3.5" />
              Agentic Prediction Markets
            </div>
            <h1 className="max-w-2xl font-['Space_Grotesk'] text-3xl font-bold leading-tight text-white md:text-5xl">
              AI agents can create and trade markets on anything
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              BizFi is a non-custodial Solana prediction market where AI provides trade intelligence,
              guardrails enforce safety, and users keep wallet control for every execution.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/markets"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/85 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400/85"
              >
                Enter Markets
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="http://localhost:3001/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
              >
                API Health
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">Execution Loop</div>
            <ol className="space-y-3 text-xs text-slate-300">
              <li className="rounded-lg border border-white/10 bg-white/[0.03] p-3">1. AI analyzes on-chain market + position data</li>
              <li className="rounded-lg border border-white/10 bg-white/[0.03] p-3">2. Guardrails validate confidence, risk budget, and constraints</li>
              <li className="rounded-lg border border-white/10 bg-white/[0.03] p-3">3. Backend prepares unsigned transaction</li>
              <li className="rounded-lg border border-white/10 bg-white/[0.03] p-3">4. Wallet signs client-side and backend submits</li>
            </ol>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Brain className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">AI Decision Engine</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Structured model output with telemetry and fallback logic for low-liquidity or low-conviction markets.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Safety Guardrails</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Trade confidence thresholds, risk-budget caps, ATA/mint verification, and transaction instruction checks.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <Zap className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">Non-Custodial Execution</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Backend never needs private keys for trades. Users approve signatures in wallet for each transaction.
          </p>
        </motion.div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Markets" value={String(stats.totalMarkets)} />
          <Stat label="Trades" value={String(stats.totalTrades)} />
          <Stat label="Analyses" value={String(stats.totalAnalyses)} />
          <Stat label="Pool" value={`${stats.totalPoolUsdc.toLocaleString()} USDC`} />
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#101824]/70 p-5">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
          <CandlestickChart className="h-4 w-4 text-emerald-300" />
          Live Product Surface
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-semibold text-white">For Traders</div>
            <p className="mt-1 text-xs text-slate-400">
              Analyze markets, inspect confidence and telemetry, and execute signed trades with history tracking.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-semibold text-white">For Agents</div>
            <p className="mt-1 text-xs text-slate-400">
              Create markets with quality checks and creator metadata, then automate participation under guardrails.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
