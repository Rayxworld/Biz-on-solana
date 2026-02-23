type TradeMetric = { userPubkey: string; amount: number; timestamp: string };
type CreateMetric = { creatorPubkey: string; feePaid: number; timestamp: string };
type AnalysisMetric = { userPubkey: string; marketId: number; timestamp: string };

const tradeMetrics: TradeMetric[] = [
  { userPubkey: "DemoUser1", amount: 5000000, timestamp: new Date().toISOString() },
  { userPubkey: "DemoUser2", amount: 15000000, timestamp: new Date().toISOString() },
];
const createMetrics: CreateMetric[] = [
  { creatorPubkey: "DemoCreator1", feePaid: 1000000, timestamp: new Date().toISOString() },
  { creatorPubkey: "DemoCreator2", feePaid: 1000000, timestamp: new Date().toISOString() },
];
const analysisMetrics: AnalysisMetric[] = [
  { userPubkey: "DemoUser1", marketId: 1, timestamp: new Date().toISOString() },
];

function keepRecent<T>(arr: T[], max = 2000): void {
  if (arr.length > max) arr.splice(0, arr.length - max);
}

export function recordTradeMetric(userPubkey: string, amount: number): void {
  tradeMetrics.push({
    userPubkey,
    amount,
    timestamp: new Date().toISOString(),
  });
  keepRecent(tradeMetrics);
}

export function recordCreateMetric(creatorPubkey: string, feePaid: number): void {
  createMetrics.push({
    creatorPubkey,
    feePaid,
    timestamp: new Date().toISOString(),
  });
  keepRecent(createMetrics);
}

export function recordAnalysisMetric(userPubkey: string, marketId: number): void {
  analysisMetrics.push({
    userPubkey,
    marketId,
    timestamp: new Date().toISOString(),
  });
  keepRecent(analysisMetrics);
}

export function getMetricsSnapshot(): {
  totalTrades: number;
  totalTradeVolumeMicroUsdc: number;
  totalCreates: number;
  totalCreationFeesMicroUsdc: number;
  totalAnalyses: number;
} {
  return {
    totalTrades: tradeMetrics.length,
    totalTradeVolumeMicroUsdc: tradeMetrics.reduce((sum, t) => sum + t.amount, 0),
    totalCreates: createMetrics.length,
    totalCreationFeesMicroUsdc: createMetrics.reduce((sum, c) => sum + c.feePaid, 0),
    totalAnalyses: analysisMetrics.length,
  };
}

export function getCreatorActivity(): Array<{
  creatorPubkey: string;
  creates: number;
  feesPaidMicroUsdc: number;
}> {
  const byCreator = new Map<string, { creates: number; feesPaidMicroUsdc: number }>();
  for (const entry of createMetrics) {
    const prev = byCreator.get(entry.creatorPubkey) || {
      creates: 0,
      feesPaidMicroUsdc: 0,
    };
    prev.creates += 1;
    prev.feesPaidMicroUsdc += entry.feePaid;
    byCreator.set(entry.creatorPubkey, prev);
  }
  return Array.from(byCreator.entries())
    .map(([creatorPubkey, stats]) => ({ creatorPubkey, ...stats }))
    .sort((a, b) => b.creates - a.creates || b.feesPaidMicroUsdc - a.feesPaidMicroUsdc);
}

