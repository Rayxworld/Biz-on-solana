import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const DEFAULT_MARKET_MINT = import.meta.env.VITE_MARKET_MINT || "";
export const DEFAULT_USER_USDC_ATA = import.meta.env.VITE_USER_USDC_ATA || "";

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
  telemetry?: {
    source: "llm" | "fallback_microstructure" | "fallback_no_liquidity" | "fallback_inactive";
    fallbackTriggered: boolean;
    notes: string[];
  };
  observability?: {
    provider: "groq";
    model: string;
    latencyMs: number;
    usedFallback: boolean;
    guardrailBlocked: boolean;
  };
  guardrails: GuardrailResult;
  marketData: unknown;
  userPosition: {
    user: string;
    market: string;
    yesAmount: number;
    noAmount: number;
    claimed: boolean;
    bump: number;
  } | null;
  riskMetrics: unknown;
  timestamp: string;
}

export interface UserPositionData {
  user: string;
  market: string;
  yesAmount: number;
  noAmount: number;
  claimed: boolean;
  bump: number;
}

export interface MarketData {
  address: string;
  marketId: number;
  usdcMint: string;
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

export interface OverviewStats {
  totalMarkets: number;
  activeMarkets: number;
  totalPoolMicroUsdc: number;
  totalPoolUsdc: number;
  totalTrades: number;
  totalTradeVolumeMicroUsdc: number;
  totalCreationFeesMicroUsdc: number;
  totalAnalyses: number;
}

export interface MarketLeaderboardEntry {
  marketId: number;
  question: string;
  totalPool: number;
  yesOdds: number;
  noOdds: number;
  creator: string;
}

export interface CreatorLeaderboardEntry {
  creator: string;
  marketsCreated: number;
  totalPool: number;
  createTxCount: number;
  feesPaidMicroUsdc: number;
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

export interface PrepareCreateMarketResponse {
  success: boolean;
  message: string;
  transaction: string;
  marketAddress: string;
  fee?: {
    amountMicroUsdc: number;
    collectorAta: string;
  };
}

export interface SubmitCreateMarketResponse {
  success: boolean;
  signature: string;
  explorer: string;
  marketAddress: string;
  creationFeePaid: number;
}

export interface CreatorMetadata {
  user_pubkey: string;
  creator_type: "human" | "agent";
  creator_label?: string | null;
  agent_id?: string | null;
  updated_at: string;
}

export interface SubmitTradeResponse {
  success: boolean;
  signature: string;
  explorer: string;
  verifiedAmount: number;
}

export interface AtaPrecheckResponse {
  ok: boolean;
  reason?: string;
  details?: {
    owner: string;
    mint: string;
    expectedOwner: string;
    expectedMint: string;
    amountUi: number;
  };
}

export interface DeriveAtaResponse {
  ok: boolean;
  ata?: string;
  exists?: boolean;
  amountUi?: number;
  reason?: string;
}

export interface PrepareCreateAtaResponse {
  ok: boolean;
  transaction?: string;
  ata?: string;
  alreadyExists?: boolean;
  reason?: string;
}

export interface SubmitCreateAtaResponse {
  ok: boolean;
  signature?: string;
  ata?: string;
  explorer?: string;
  reason?: string;
}

export async function fetchMarkets(): Promise<{ source: string; markets: MarketData[] }> {
  const { data } = await api.get("/markets");
  return data;
}

export async function fetchMarketById(id: number): Promise<MarketData> {
  const { data } = await api.get(`/markets/${id}`);
  return data;
}

export async function fetchMarketUserPosition(
  marketId: number,
  userPubkey: string
): Promise<UserPositionData | null> {
  const { data } = await api.get(`/markets/${marketId}/position/${userPubkey}`);
  return data.position || null;
}

export async function prepareCreateMarket(params: {
  marketId: number;
  creatorPubkey: string;
  creatorUsdcAta: string;
  usdcMint: string;
  question: string;
  durationSeconds: number;
  creatorType?: "human" | "agent";
  creatorLabel?: string;
  agentId?: string;
}): Promise<PrepareCreateMarketResponse> {
  const { data } = await api.post("/markets/prepare-create", params);
  return data;
}

export async function precheckCreatorAta(params: {
  creatorPubkey: string;
  creatorUsdcAta: string;
  usdcMint: string;
}): Promise<AtaPrecheckResponse> {
  const { data } = await api.post("/markets/precheck-creator-ata", params);
  return data;
}

export async function submitCreateMarket(params: {
  signedTransaction: string;
  creatorPubkey: string;
}): Promise<SubmitCreateMarketResponse> {
  const { data } = await api.post("/markets/submit-create", params);
  return data;
}

export async function fetchCreatorMetadata(userPubkey: string): Promise<CreatorMetadata | null> {
  const { data } = await api.get(`/markets/creator/${userPubkey}`);
  return data.creator || null;
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

export async function precheckAta(params: {
  marketId: number;
  userPubkey: string;
  userUsdcAta: string;
}): Promise<AtaPrecheckResponse> {
  const { data } = await api.post("/trade/precheck-ata", params);
  return data;
}

export async function deriveAta(params: {
  userPubkey: string;
  mint: string;
}): Promise<DeriveAtaResponse> {
  const { data } = await api.post("/trade/derive-ata", params);
  return data;
}

export async function prepareCreateAta(params: {
  userPubkey: string;
  mint: string;
}): Promise<PrepareCreateAtaResponse> {
  const { data } = await api.post("/trade/prepare-create-ata", params);
  return data;
}

export async function submitCreateAta(params: {
  signedTransaction: string;
  userPubkey: string;
  mint: string;
}): Promise<SubmitCreateAtaResponse> {
  const { data } = await api.post("/trade/submit-create-ata", params);
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

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const { data } = await api.get("/stats/overview");
  return data;
}

export async function fetchMarketLeaderboard(): Promise<MarketLeaderboardEntry[]> {
  const { data } = await api.get("/stats/leaderboard/markets");
  return data.markets || [];
}

export async function fetchCreatorLeaderboard(): Promise<CreatorLeaderboardEntry[]> {
  const { data } = await api.get("/stats/leaderboard/creators");
  return data.creators || [];
}
