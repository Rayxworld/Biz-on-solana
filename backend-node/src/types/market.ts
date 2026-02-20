export interface MarketAccount {
  marketId: number;
  creator: string;
  question: string;
  endTime: number;
  status: { active: {} } | { resolved: {} } | { disputed: {} };
  totalPool: number;
  yesPool: number;
  noPool: number;
  outcome: boolean;
  usdcMint: string;
  marketBump: number;
  vaultBump: number;
  vaultAuthorityBump: number;
}

export interface UserPosition {
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
  creator: string;
  question: string;
  endTime: number;
  isActive: boolean;
  totalPool: number;
  yesPool: number;
  noPool: number;
  yesOdds: number;
  noOdds: number;
  outcome: boolean;
  timeRemaining: number;
}
