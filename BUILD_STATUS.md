# BizMarket Build Status

Last updated: 2026-02-20

## What Is Built

### Smart Contract (Solana + Anchor)
- Program name: `bizfi_maret`
- Program ID: `5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr`
- Instructions: `initialize_market`, `place_bet`, `resolve_market`, `claim_winnings`
- PDA model: `market`, `position`, `vault`, `vault_authority`
- PDA encoding: `market_id` as `u64` little-endian 8 bytes

### Active Backend (`backend-node`)
- Express + TypeScript API
- Solana client isolated under `src/solana`
- Canonical IDL path support (`SOLANA_IDL_PATH`, default `../contracts/target/idl/bizfi_market.json`)
- AI analysis module using LangChain + OpenAI
- Guardrails with strict Zod output parsing
- Non-custodial execution flow:
  - backend prepares unsigned tx
  - wallet signs
  - backend submits signed tx
- Signed transaction verification on submit:
  - fee payer/user pubkey match
  - program instruction match
  - `place_bet` discriminator match
  - amount decoded from signed tx for risk tracking
- Middleware split:
  - `src/middleware/rateLimit.ts`
  - `src/middleware/validate.ts`

### Frontend (`frontend`)
- React + Vite app
- Wallet connect flow (Phantom)
- Markets list + market detail
- AI suggestion panel + confidence meter + execution history
- API usage aligned to Node backend routes only

### Legacy Backend (`backend`)
- Preserved as legacy reference
- Not part of active MVP runtime

## Stack

### On-chain
- Rust
- Anchor (`anchor_lang`, `anchor_spl`)

### Backend
- Node.js + Express
- TypeScript
- `@solana/web3.js`
- `@coral-xyz/anchor`
- LangChain (`@langchain/core`, `@langchain/openai`)
- Zod
- Supabase JS client

### Frontend
- React + TypeScript
- Vite
- Axios
- Tailwind CSS
- React Router

## Known Constraints

1. Contract folder rename is partially complete in filesystem:
- canonical folder now present: `contracts/programs/bizfi_market/`
- compatibility folder still present: `contracts/programs/bizfun_market/`
2. Daily control is currently a spend-based daily risk budget (not realized PnL).
3. Full backend AI typecheck can be memory heavy on low-memory environments.

## Current Folder Structure (Source-focused)

```text
Bizmarket-on-solana/
├── backend/
├── backend-node/
│   ├── src/
│   │   ├── ai/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── solana/
│   │   └── types/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig*.json
├── contracts/
│   ├── programs/
│   │   ├── bizfi_market/
│   │   └── bizfun_market/  (compatibility alias, pending cleanup)
│   ├── solpg_handoff/
│   └── target/
│       └── idl/
│           └── bizfi_market.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── types/
│   └── package.json
├── README.md
├── README_BIZFI_AI.md
└── SUBMISSION_CHECKLIST.md
```
