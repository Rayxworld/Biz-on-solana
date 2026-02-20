BizFi prediction market contract handoff (Solana Devnet)

Scope (on-chain):
- Create market, accept bets, resolve, pay winners

Scope (off-chain):
- AI analysis workflow, execution guardrails, frontend integration

Program:
- Name: `bizfi_market`
- Program ID: `5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr`
- Deploy tx: `52q7dqhxDTsmQ8toyxxKCiBiQsfN1R4vaNodV4DE2QhP8jbycnwP119dTrCmBiSN5SuPAjvEQo6HFaFbP4xjJbkK`

Authoritative artifacts:
- Source (runtime): `contracts/programs/bizfi_market/src/lib.rs`
- Canonical IDL (runtime): `contracts/target/idl/bizfi_market.json`

Distribution artifacts:
- `contracts/solpg_handoff/bizfi_market.json`
- `contracts/solpg_handoff/PDA_SPEC.md`
- `contracts/solpg_handoff/CALL_EXAMPLES.md`
- `contracts/solpg_handoff/DEPLOYMENT_CHECKLIST.md`

Instructions:
1) `initialize_market(market_id, question, duration)`
2) `place_bet(amount, bet_on_yes)`
3) `resolve_market(outcome)`
4) `claim_winnings()`

PDA seeds:
- market: `["market", market_id_u64_le]`
- position: `["position", market_id_u64_le, user_pubkey]`
- vault: `["vault", market_id_u64_le]`
- vault_authority: `["vault_authority", market_id_u64_le]`

Known limitations:
- Manual resolution by creator
- No oracle integration
