import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export interface TradeAnalysis {
  suggested_side: "yes" | "no" | "abstain";
  suggested_amount: number;
  confidence: number;
  reasoning: string;
  risk_score: number;
}

export interface GuardrailResult {
  allowed: boolean;
  reasons: string[];
}

export interface AnalysisResponse {
  success: boolean;
  analysis: TradeAnalysis;
  guardrails: GuardrailResult;
  marketData: unknown;
  userPosition: unknown;
  riskMetrics: unknown;
  timestamp: string;
}

export interface MarketData {
  address: string;
  marketId: number;
  question: string;
  totalPool: number;
  yesPool: number;
  noPool: number;
  yesOdds: number;
  noOdds: number;
  isActive: boolean;
  timeRemaining: number;
  endTime: number;
  creator: string;
  outcome: boolean;
}

export interface PlatformStats {
  active_markets: number;
  total_volume: string;
  total_traders: number;
  markets_resolved: number;
}

export interface PrepareTradeResponse {
  success: boolean;
  message: string;
  transaction: string;
  marketAddress: string;
}

export interface SubmitTradeResponse {
  success: boolean;
  signature: string;
  explorer: string;
  verifiedAmount: number;
}

export async function fetchMarkets(): Promise<{ source: string; markets: MarketData[] }> {
  const { data } = await api.get("/markets");
  return data;
}

export async function fetchMarketById(id: number): Promise<MarketData> {
  const { data } = await api.get(`/markets/${id}`);
  return data;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { markets } = await fetchMarkets();
  const active = markets.filter((m) => m.isActive).length;
  const resolved = markets.filter((m) => !m.isActive).length;
  const totalVolumeMicro = markets.reduce((sum, m) => sum + m.totalPool, 0);
  const totalVolume = (totalVolumeMicro / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    active_markets: active,
    total_volume: `${totalVolume} USDC`,
    total_traders: 0,
    markets_resolved: resolved,
  };
}

export async function requestAIAnalysis(
  marketId: number,
  userPubkey: string
): Promise<AnalysisResponse> {
  const { data } = await api.post("/ai/analyze", { marketId, userPubkey });
  return data;
}

export async function fetchAILogs(userPubkey: string): Promise<any[]> {
  const { data } = await api.get(`/ai/logs/${userPubkey}`);
  return data.logs || [];
}

export async function prepareTrade(params: {
  marketId: number;
  userPubkey: string;
  userUsdcAta: string;
  amount: number;
  betOnYes: boolean;
}): Promise<PrepareTradeResponse> {
  const { data } = await api.post("/trade/prepare", params);
  return data;
}

export async function submitTrade(params: {
  signedTransaction: string;
  userPubkey: string;
  amount?: number;
}): Promise<SubmitTradeResponse> {
  const { data } = await api.post("/trade/submit", params);
  return data;
}

export async function fetchTradeHistory(userPubkey: string): Promise<any[]> {
  const { data } = await api.get(`/trade/history/${userPubkey}`);
  return data.transactions || [];
}

export async function healthCheck(): Promise<unknown> {
  const { data } = await api.get("/health");
  return data;
}

export async function fetchProgramStatus(): Promise<{
  programId: string;
  exists: boolean;
  executable?: boolean;
  lamports?: number;
}> {
  const { data } = await api.get("/program/status");
  return data;
}
