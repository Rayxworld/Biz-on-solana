import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, TrendingUp, HandCoins, BarChart3, Users } from 'lucide-react';
import { motion } from "framer-motion";
import { type OverviewStats, fetchOverviewStats } from '../lib/api';

const Admin: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchOverviewStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load admin stats", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
    
    // Poll every 10 seconds for live updates
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUsdc = (micro: number) =>
    (micro / 1_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-emerald-400">
            <ShieldCheck size={16} />
            Platform Control Center
          </div>
          <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold text-white">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
          <Activity size={16} className="text-emerald-300 animate-pulse" />
          Live Metrics
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Revenue Card (Primary Focus) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="col-span-1 flex flex-col justify-between rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 shadow-[0_0_30px_-10px_rgba(52,211,153,0.3)] md:col-span-2 lg:col-span-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20">
                <HandCoins className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">
                Total Fees Collected
              </div>
            </div>
            <div className="mt-4 text-5xl font-bold tracking-tight text-white">
              {formatUsdc(stats.totalCreationFeesMicroUsdc)} <span className="text-2xl text-emerald-400/80">USDC</span>
            </div>
            <p className="mt-3 text-sm text-emerald-200/60">
              Aggregated from market creation fees across the platform.
            </p>
          </motion.div>

          <StatBox 
            title="Total Trade Volume" 
            value={`${formatUsdc(stats.totalTradeVolumeMicroUsdc)} USDC`}
            icon={<TrendingUp size={18} />}
            delay={0.1}
          />
          <StatBox 
            title="Total Pool Deposits" 
            value={`${stats.totalPoolUsdc.toLocaleString()} USDC`}
            icon={<BarChart3 size={18} />}
            delay={0.2}
          />
          <StatBox 
            title="Markets Created" 
            value={stats.totalMarkets.toString()}
            icon={<Activity size={18} />}
            delay={0.3}
          />
          <StatBox 
            title="Active Markets" 
            value={stats.activeMarkets.toString()}
            icon={<Activity size={18} />}
            delay={0.4}
          />
          <StatBox 
            title="Total AI Analyses" 
            value={stats.totalAnalyses.toString()}
            icon={<Users size={18} />}
            delay={0.5}
          />
          <StatBox 
            title="Total Trades Executed" 
            value={stats.totalTrades.toString()}
            icon={<TrendingUp size={18} />}
            delay={0.6}
          />

          {/* Platform Config Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="col-span-1 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121a23]/60 p-6 shadow-xl md:col-span-2 lg:col-span-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10">
                <ShieldCheck className="h-5 w-5 text-sky-300" />
              </div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-300">
                Platform Wallet Configuration
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Fee Collector (Wallet)</div>
              <div className="font-mono text-sm break-all text-emerald-400 select-all cursor-pointer hover:text-emerald-300 transition-colors" title="Click to copy">
                {stats.feeCollector}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                This treasury wallet receives all {formatUsdc(stats.totalCreationFeesMicroUsdc)} USDC in platform fees. 
                Associated Token Accounts (ATAs) are derived and created automatically for each market mint.
              </p>
            </div>
          </motion.div>

        </div>
      ) : (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300">
          Failed to load administration metrics. Please ensure the backend is reachable.
        </div>
      )}
    </section>
  );
};

function StatBox({ title, value, icon, delay }: { title: string, value: string, icon: React.ReactNode, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col justify-center rounded-2xl border border-white/10 bg-[#121a23]/80 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)]"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
        <span className="text-sky-400">{icon}</span>
        {title}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </motion.div>
  );
}

export default Admin;
