# Call Examples (Devnet)

Use this as the exact handoff reference for how each instruction should be called.
All token amounts are in base units (USDC has 6 decimals).

## 1) initialize_market
### Args
```json
{
  "market_id": 1,
  "question": "Will we reach $3k MRR in 30 days?",
  "duration": 1209600
}
```
### Accounts
- `market` (PDA)
- `vault_authority` (PDA)
- `vault_usdc` (PDA token account)
- `usdc_mint`
- `creator` (signer)
- `token_program`
- `system_program`
- `rent`

### Expected Result
- Market account initialized
- `status = Active`
- `end_time = now + duration`

---

## 2) place_bet
### Args
```json
{
  "amount": 10000000,
  "bet_on_yes": true
}
```
### Accounts
- `market` (PDA)
- `user` (signer)
- `user_usdc`
- `vault_authority` (PDA)
- `vault_usdc` (PDA token account)
- `user_position` (PDA)
- `token_program`
- `system_program`
- `rent`

### Expected Result
- USDC transferred from user token account to vault
- `total_pool`, `yes_pool`/`no_pool` updated
- User position updated

---

## 3) resolve_market
### Args
```json
{
  "outcome": true
}
```
### Accounts
- `market` (PDA)
- `authority` (must be market creator)

### Expected Result
- `status = Resolved`
- `outcome = true`

---

## 4) claim_winnings
### Args
```json
{}
```
### Accounts
- `market` (PDA)
- `user` (signer)
- `user_usdc`
- `vault_authority` (PDA)
- `vault_usdc` (PDA token account)
- `user_position` (PDA)
- `token_program`

### Expected Result
- Winning payout transferred to user token account
- `claimed = true`

---

## Transaction Signatures
- initialize_market tx: `2PtWJCwGzfPkCCLtQSD5JVpqhRQFVmEcS57xeaQLVsHbLjMVJJn2vyy15wd1TcZPGb8PxkkP4SpZ5aeuGRBDBLL`
- place_bet tx: `4zGW8xtwb6G76sJUt5NRV2SfkMoPcXAKZ3XunBECKtiGndr2GyLQWUkHPk1UfYQvRxTWq18MLEFGUWzcL1VcFxXT`
- resolve_market tx: `9RMLSHgtytHqeLbJ4R5NyPMhnVsXLCZ137XoHXvwaccvfzwTmW1S2jEcohnVXUuYLYLYr7fpsJCSEDrhxxq7UYf`
- claim_winnings tx: `2aGMcMn71uzL56nqD9VT9S729XTgxYAG6DxrKDfh3YgrpioZGyqfkYQqb142a399LQyirG3P1zqkK99SZopHiUks`
