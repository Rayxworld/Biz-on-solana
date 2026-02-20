# Deployment Checklist (SolPG Devnet)

## A) Build and Deploy
- [ ] Open `beta.solpg.io`
- [ ] Select Anchor project
- [ ] Paste final `lib.rs`
- [ ] Build succeeds with no errors
- [ ] Deploy to Devnet succeeds
- [ ] Record Program ID
- [ ] Record deploy transaction signature

## B) Identity Consistency
- [ ] `declare_id!` in `lib.rs` matches deployed Program ID
- [ ] Exported IDL is from this exact build/deploy
- [ ] IDL program name is correct
- [ ] IDL accounts include PDAs (`market`, `vault_authority`, `vault_usdc`, `user_position`)

## C) Instruction Verification
- [ ] `initialize_market` executed once (tx recorded)
- [ ] `place_bet` executed once (tx recorded)
- [ ] `resolve_market` executed once (tx recorded)
- [ ] `claim_winnings` executed once (tx recorded)

## D) Security Checks
- [ ] PDA constraints are active
- [ ] Vault transfer authority uses PDA signer seeds
- [ ] Unauthorized resolve fails
- [ ] Late bet fails
- [ ] Double claim fails

## E) Fill Before Sharing
- Program ID: `5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr`
- Deploy tx: `52q7dqhxDTsmQ8toyxxKCiBiQsfN1R4vaNodV4DE2QhP8jbycnwP119dTrCmBiSN5SuPAjvEQo6HFaFbP4xjJbkK`
- initialize_market tx: `2PtWJCwGzfPkCCLtQSD5JVpqhRQFVmEcS57xeaQLVsHbLjMVJJn2vyy15wd1TcZPGb8PxkkP4SpZ5aeuGRBDBLL`
- place_bet tx: `4zGW8xtwb6G76sJUt5NRV2SfkMoPcXAKZ3XunBECKtiGndr2GyLQWUkHPk1UfYQvRxTWq18MLEFGUWzcL1VcFxXT`
- resolve_market tx: `9RMLSHgtytHqeLbJ4R5NyPMhnVsXLCZ137XoHXvwaccvfzwTmW1S2jEcohnVXUuYLYLYr7fpsJCSEDrhxxq7UYf`
- claim_winnings tx: `2aGMcMn71uzL56nqD9VT9S729XTgxYAG6DxrKDfh3YgrpioZGyqfkYQqb142a399LQyirG3P1zqkK99SZopHiUks`

## F) Files to Share
- [ ] `lib.rs`
- [ ] `bizfi_market.json`
- [ ] `README_contract.md`
- [ ] `PDA_SPEC.md`
- [ ] `CALL_EXAMPLES.md`
- [ ] `DEPLOYMENT_CHECKLIST.md`
- [ ] `HANDOFF_TEMPLATE.md`
