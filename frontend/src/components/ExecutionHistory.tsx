import React, { useEffect, useState } from 'react';
import { fetchAILogs, fetchTradeHistory } from '../lib/api';
import { Clock, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

interface ExecutionHistoryProps {
  walletAddress: string | null;
  refreshTrigger?: number;
}

interface LogEntry {
  market_id: number;
  analysis_json: {
    suggested_side: string;
    suggested_amount: number;
    confidence: number;
    reasoning: string;
    risk_score: number;
  };
  guardrail_result: { allowed: boolean; reasons: string[] };
  action_taken: string;
  created_at: string;
}

const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({ walletAddress, refreshTrigger }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'analyses' | 'trades'>('analyses');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;

    const load = async () => {
      setLoading(true);
      try {
        const [logData, tradeData] = await Promise.all([
          fetchAILogs(walletAddress),
          fetchTradeHistory(walletAddress),
        ]);
        setLogs(logData);
        setTrades(tradeData);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [walletAddress, refreshTrigger]);

  if (!walletAddress) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-xs text-slate-400">Connect wallet to see history</p>
      </div>
    );
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SideIcon = ({ side }: { side: string }) => {
    if (side === 'yes') return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    if (side === 'no') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    return <Minus className="h-3.5 w-3.5 text-slate-400" />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-white">History</h3>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-white/5 p-1">
        {(['analyses', 'trades'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
              activeTab === tab
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-xs text-slate-500">Loading...</p>
      ) : activeTab === 'analyses' ? (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No AI analyses yet. Try analyzing a market!
            </p>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <SideIcon side={log.analysis_json?.suggested_side || log.action_taken} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Market #{log.market_id}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        log.guardrail_result?.allowed
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {log.guardrail_result?.allowed ? 'passed' : 'blocked'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {log.analysis_json?.reasoning?.slice(0, 80)}...
                  </p>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] text-slate-500">
                    {log.analysis_json?.confidence
                      ? `${(log.analysis_json.confidence * 100).toFixed(0)}%`
                      : '--'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-600">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(log.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {trades.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No trades executed yet.</p>
          ) : (
            trades.map((tx, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div
                  className={`h-2 w-2 rounded-full ${tx.err ? 'bg-red-400' : 'bg-emerald-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-mono text-slate-300">
                    {tx.signature?.slice(0, 20)}...
                  </p>
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300"
                >
                  Explorer <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionHistory;
