# BizFi AI - AI-Powered Prediction Markets on Solana

## Architecture

- Frontend: React + Vite
- Backend: `backend-node` (Node + TypeScript + Express)
- On-chain: Anchor program `bizfi_market` on Solana Devnet
- AI: LangChain + OpenAI with structured JSON output and Zod parsing

## Canonical Contract + IDL

- Program name: `bizfi_market`
- Program ID: `5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr`
- Canonical IDL path: `contracts/target/idl/bizfi_market.json`
- Backend IDL config: `SOLANA_IDL_PATH` (defaults to canonical path)

## Non-Custodial Trade Flow

1. Frontend calls `POST /api/trade/prepare`.
2. Backend builds unsigned `place_bet` transaction.
3. Wallet signs client-side.
4. Frontend sends signed tx to `POST /api/trade/submit`.
5. Backend verifies signer + instruction + decoded amount, then submits.

## AI + Guardrails Flow

1. Frontend calls `POST /api/ai/analyze` with `marketId` and `userPubkey`.
2. Backend fetches market/position data from Solana.
3. AI returns structured analysis JSON.
4. Zod validates output.
5. Guardrails enforce:
   - confidence threshold
   - allocation cap
   - daily risk budget cap (spend-based, demo semantics)
   - market whitelist

## API Routes

- `GET /api/health`
- `GET /api/markets`
- `GET /api/markets/:id`
- `GET /api/markets/:id/history`
- `POST /api/ai/analyze`
- `GET /api/ai/logs/:userPubkey`
- `POST /api/trade/prepare`
- `POST /api/trade/submit`
- `GET /api/trade/history/:userPubkey`
- `GET /api/program/status`
- `GET /api/program/startup-check`

## Environment

`backend-node/.env.example`:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SOLANA_RPC_URL`
- `HELIUS_API_KEY` (optional)
- `SOLANA_PROGRAM_ID`
- `SOLANA_IDL_PATH`
- `SUPABASE_URL` (optional)
- `SUPABASE_SERVICE_KEY` (optional)
- `PORT`
- `CORS_ORIGIN`

## Safety Model

- User signs all transactions.
- Backend does not custody user private keys.
- Signed transaction is verified before submission.
- AI output is schema-validated before guardrail enforcement.
- AI reasoning logs can be persisted to Supabase.

## Browser Console Notes During Demo

- Phantom and other installed wallet extensions may emit console warnings unrelated to this app.
- Messages like `Failed to connect to MetaMask` are expected if MetaMask is installed but not configured for this app flow.
- The active wallet path in this project is Phantom (`window.solana`).
- The critical runtime signal is backend availability (`/api/health`), not extension debug logs.
