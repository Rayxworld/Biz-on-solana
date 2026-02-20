export interface PrepareTradeRequest {
  marketId: number;
  userPubkey: string;
  userUsdcAta: string;
  amount: number;
  betOnYes: boolean;
}

export interface SubmitTradeRequest {
  signedTransaction: string;
  userPubkey: string;
  amount?: number;
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
