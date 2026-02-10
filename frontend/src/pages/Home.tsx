import React, { useEffect, useState } from 'react';
import { BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Stats = {
  active_markets: number;
  total_volume: string;
  total_traders: number;
  markets_resolved: number;
};

const Home: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/stats').then((res) => setStats(res.data)).catch(() => setStats(null));
  }, []);

  return (
    <main className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="lg:col-span-7 space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)]">
          <div className="text-sm uppercase tracking-[0.35em] text-slate-400">BizMart Studio</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl font-['Space_Grotesk']">
            A premium interface for launching prediction markets.
          </h1>
          <p className="mt-4 text-sm text-slate-300 md:text-base">
            Tokenize ideas, founders, and products into liquid markets. Build a narrative, fund a thesis, and launch in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/launch"
              className="rounded-full bg-emerald-400/90 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300"
            >
              Launch Market
            </Link>
            <Link
              to="/markets"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-white/10"
            >
              Explore Markets
            </Link>
            <Link
              to="/terminal"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-white/10"
            >
              Open Terminal
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)]">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Demo Session</div>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              Hey, I'm $BizMart. I help tokenize ideas, businesses, and even careers. Ready?
            </div>
            <div className="rounded-2xl bg-emerald-400/80 px-4 py-3 text-slate-900">
              Type: Business — Name: BizFun AI — Socials: https://x.com/bizfunai
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              Great. What’s the short pitch you’d use on X?
            </div>
            <div className="rounded-2xl bg-emerald-400/80 px-4 py-3 text-slate-900">
              We’re building an AI agent for prediction markets.
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">This is a preview transcript. Open the Terminal for the live session.</p>
        </div>
      </section>

      <aside className="lg:col-span-5 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Terminal Help</div>
          <pre className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-200 whitespace-pre-wrap">
{`bizmart --help

USAGE:
  Answer in one message, label each field:

  Type: Business
  Name: BizFun AI
  Socials: https://x.com/bizfunai
  Description: We’re building an AI agent for prediction markets.
  Audience/Value: Startup founders & crypto builders; automated market creation.
  Stage: Building
  Prediction: Revenue growth
  Question: Will we reach $3k MRR in 30 days?
  Duration: 14 days
  Chain: Solana
  Vibe: Serious
  Marketing: Chaos mode
  Wallet: <USDC address>

TIP:
  You can send all fields at once, then type: confirm`}
          </pre>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.35em] text-slate-400">Live Metrics</h2>
            <BarChart3 size={18} className="text-emerald-300" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.active_markets ?? '—'}</div>
              Active Markets
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.total_volume ?? '—'}</div>
              Total Volume
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.total_traders ?? '—'}</div>
              Traders
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.markets_resolved ?? '—'}</div>
              Resolved Markets
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 via-slate-950/70 to-slate-950/90 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-200">
            <Sparkles size={14} />
            Premium Launch
          </div>
          <p className="mt-3 text-sm text-slate-200">
            One-time fee of <span className="font-semibold text-emerald-300">10 USDC</span> to deploy on three chains with managed liquidity and automated marketing.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
            <TrendingUp size={14} />
            Launch Path
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span>Discovery</span>
              <span className="text-emerald-300">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Context</span>
              <span className="text-slate-500">Queued</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Market</span>
              <span className="text-slate-500">Queued</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Launch</span>
              <span className="text-slate-500">Queued</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
};

export default Home;
