import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, DollarSign } from "lucide-react";
import AISuggestionPanel from "../components/AISuggestionPanel";
import ExecutionHistory from "../components/ExecutionHistory";
import type { MarketData, TradeAnalysis } from "../lib/api";
import { fetchMarkets } from "../lib/api";

interface MarketDetailProps {
  walletAddress: string | null;
}

const MarketDetail: React.FC<MarketDetailProps> = ({ walletAddress }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets()
      .then((result) => {
        const found = result.markets.find((m) => m.marketId === parseInt(id || "0", 10));
        setMarket(found || null);
      })
      .catch(() => setMarket(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExecute = (analysis: TradeAnalysis) => {
    alert(
      `Execute ${analysis.suggested_side.toUpperCase()} ${(analysis.suggested_amount / 1_000_000).toFixed(2)} USDC via wallet signature.`
    );
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
        <AISuggestionPanel marketId={market.marketId} walletAddress={walletAddress} onExecute={handleExecute} />
        <ExecutionHistory walletAddress={walletAddress} />
      </div>
    </div>
  );
};

export default MarketDetail;
