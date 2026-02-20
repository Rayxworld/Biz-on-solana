import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Brain, ArrowRight } from 'lucide-react';
import { fetchMarkets, type MarketData } from '../lib/api';

const Markets: React.FC = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets()
      .then((res) => setMarkets(res.markets))
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false));
  }, []);

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
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {markets.map((m) => {
            const yPct = Math.round(m.yesOdds * 100);
            const nPct = Math.round(m.noOdds * 100);

            return (
              <div
                key={m.marketId}
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

                {/* Odds Bar */}
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Markets;
