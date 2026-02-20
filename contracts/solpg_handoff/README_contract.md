# BizFi Prediction Market Contract (Solana Devnet)

## 1) Contract Scope
On-chain only:
- Create a prediction market with a question and end time.
- Accept USDC bets into a PDA vault.
- Resolve outcome after expiry (creator only).
- Pay winners pro-rata from the vault.

Off-chain (not in this contract):
- Token deployment on other chains.
- AI agent workflow, marketing, and social posting.
- Cross-chain coordination.
- Automated oracle resolution.

## 2) Contract Identity
- Program name: `bizfi_market`
- Network: `devnet`
- Program ID: `5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr`
- Deploy signature: `52q7dqhxDTsmQ8toyxxKCiBiQsfN1R4vaNodV4DE2QhP8jbycnwP119dTrCmBiSN5SuPAjvEQo6HFaFbP4xjJbkK`
- IDL file: `bizfi_market.json`

## 3) Instructions
1. `initialize_market(market_id: u64, question: String, duration: i64)`
2. `place_bet(amount: u64, bet_on_yes: bool)`
3. `resolve_market(outcome: bool)`
4. `claim_winnings()`

## 4) PDA Seeds
- `market`: ["market", market_id]
- `position`: ["position", market_id, user_pubkey]
- `vault`: ["vault", market_id]
- `vault_authority`: ["vault_authority", market_id]

## 5) Main Accounts (State)
- `Market`
  - `market_id: u64`
  - `creator: Pubkey`
  - `question: String`
  - `end_time: i64`
  - `status: MarketStatus`
  - `total_pool: u64`
  - `yes_pool: u64`
  - `no_pool: u64`
  - `outcome: bool`
  - `usdc_mint: Pubkey`
  - `market_bump: u8`
  - `vault_bump: u8`
  - `vault_authority_bump: u8`
- `UserPosition`
  - `user: Pubkey`
  - `market: Pubkey`
  - `yes_amount: u64`
  - `no_amount: u64`
  - `claimed: bool`
  - `bump: u8`

## 6) Known Limitations
- Resolution is manual and controlled by `creator`.
- No on-chain fee logic (if needed, add a fee vault and fee transfer).
- No on-chain oracle integration.

## 7) Files Included
- `lib.rs` (deployed source)
- `bizfi_market.json` (IDL from same build)
- `PDA_SPEC.md`
- `CALL_EXAMPLES.md`
- `DEPLOYMENT_CHECKLIST.md`
- `HANDOFF_TEMPLATE.md`
