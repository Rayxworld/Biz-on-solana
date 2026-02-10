import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api } from '../lib/api';

type Market = {
  id: number;
  title: string;
  question: string;
  pool: string;
  ends_in: string;
  type: string;
  yes_percentage: number;
  no_percentage: number;
};

const Markets: React.FC = () => {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    api.get<Market[]>('/markets').then((res) => setMarkets(res.data)).catch(() => setMarkets([]));
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Markets</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Live Prediction Markets</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
          <BarChart3 size={16} className="text-emerald-300" />
          Updated from backend
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {markets.map((m) => (
          <div key={m.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)]">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>{m.title}</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-200">
                {m.ends_in} left
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-200">"{m.question}"</p>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="text-emerald-300">YES {m.yes_percentage}%</span>
                <span className="text-rose-300">NO {m.no_percentage}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-900/70 overflow-hidden flex">
                <div className="bg-emerald-400" style={{ width: `${m.yes_percentage}%` }}></div>
                <div className="bg-rose-400" style={{ width: `${m.no_percentage}%` }}></div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Pool: {m.pool}</span>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-emerald-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200 hover:bg-emerald-400/10"
                  onClick={() => alert('Bet YES flow coming next.')}
                >
                  Bet Yes
                </button>
                <button
                  className="rounded-full border border-rose-400/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200 hover:bg-rose-400/10"
                  onClick={() => alert('Bet NO flow coming next.')}
                >
                  Bet No
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Markets;
