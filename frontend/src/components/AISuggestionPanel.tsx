import React, { useState } from 'react';
import ConfidenceMeter from './ConfidenceMeter';
import type { TradeAnalysis, GuardrailResult } from '../lib/api';
import { requestAIAnalysis } from '../lib/api';
import { Brain, Shield, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface AISuggestionPanelProps {
  marketId: number;
  walletAddress: string | null;
  onExecute?: (analysis: TradeAnalysis) => void;
}

const AISuggestionPanel: React.FC<AISuggestionPanelProps> = ({
  marketId,
  walletAddress,
  onExecute,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!walletAddress) {
      setError('Connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await requestAIAnalysis(marketId, walletAddress);
      setAnalysis(result.analysis);
      setGuardrails(result.guardrails);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
          <Brain className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Analysis</h3>
          <p className="text-xs text-slate-400">Powered by BizFi AI</p>
        </div>
      </div>

      {/* Analyze Button */}
      {!analysis && (
        <button
          onClick={handleAnalyze}
          disabled={loading || !walletAddress}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/80 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing market...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              {walletAddress ? 'Run AI Analysis' : 'Connect Wallet First'}
            </>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="mt-2 space-y-4">
          {/* Confidence + Suggestion */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <ConfidenceMeter confidence={analysis.confidence} size={100} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    analysis.suggested_side === 'yes'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : analysis.suggested_side === 'no'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {analysis.suggested_side}
                </span>
                <span className="text-xs text-slate-400">
                  {(analysis.suggested_amount / 1_000_000).toFixed(2)} USDC
                </span>
              </div>

              {/* Risk Score */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Risk</span>
                <div className="h-1.5 flex-1 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${analysis.risk_score * 100}%`,
                      backgroundColor:
                        analysis.risk_score > 0.7
                          ? '#f87171'
                          : analysis.risk_score > 0.4
                          ? '#fbbf24'
                          : '#34d399',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {(analysis.risk_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Reasoning
            </h4>
            <p className="text-xs leading-relaxed text-slate-300">{analysis.reasoning}</p>
          </div>

          {/* Guardrails */}
          {guardrails && (
            <div
              className={`rounded-xl border p-3 ${
                guardrails.allowed
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                {guardrails.allowed ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">
                      Guardrails: Passed
                    </span>
                  </>
                ) : (
                  <>
                    <Shield className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">
                      Guardrails: Blocked
                    </span>
                  </>
                )}
              </div>
              {guardrails.reasons.length > 0 && (
                <ul className="space-y-1">
                  {guardrails.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/60" />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Execute Button */}
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Re-analyze
            </button>
            {guardrails?.allowed && analysis.suggested_side !== 'abstain' && (
              <button
                onClick={() => onExecute?.(analysis)}
                className="flex-1 rounded-xl bg-emerald-500/80 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400/80"
              >
                Execute Trade
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISuggestionPanel;
