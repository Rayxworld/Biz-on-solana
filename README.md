# Bizmarket-on-solana

## Project Overview
- **Frontend**: Vite + React + Tailwind UI for BizFi/BizMart chat, markets, and launch flows.
- **Backend**: FastAPI server that powers chat (`/chat`), markets (`/markets`), stats (`/stats`), and Solana program checks (`/program/*`).
- **Solana**: Program ID configured in `.env`, IDL available at `backend/idl/bizfi_market.json`.

## Repository Structure
- `frontend/` — React UI (Vite, Tailwind)
  - `src/App.tsx` — main UI and chat
  - `src/index.css` — Tailwind + global styles
- `backend/` — FastAPI + agent + Solana orchestration
  - `main.py` — API routes
  - `agent.py` — OpenRouter chat agent
  - `solana_client.py` — Solana RPC + program status helpers
- `idl/bizfi_market.json` — Anchor IDL for on-chain program
- `contracts/` — on-chain/contract artifacts (if any)
- `README.md` — project info and run steps

## Status Summary (So Far)

### Backend
- Switched LLM config to OpenRouter in `backend/agent.py` (uses `OPENROUTER_*` env vars).
- Added Solana program status endpoints:
  - `GET /program/status`
  - `GET /program/accounts`
- Added `SOLANA_PROGRAM_ID` support in `backend/solana_client.py`.
- Updated `backend/.env.example` to include OpenRouter + program ID settings.
- IDL found at `backend/idl/idl.json` with program name `bizfi_market`.

### Frontend
- Premium UI redesign implemented in `frontend/src/App.tsx`.
- Tailwind configs added:
  - `frontend/tailwind.config.js`
  - `frontend/postcss.config.js`
- Fonts added in `frontend/src/index.css`.

### Current Running Notes
- Backend runs on `http://localhost:8000`.

---

## How To Run (Current)

### Backend (Conda)
```
conda create -n bizfi python=3.12
conda activate bizfi
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```
cd frontend
npm install
npm run dev
```

---

## Env Vars Needed
Add to `backend/.env`:
```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-oss-120b:free
SOLANA_PROGRAM_ID=GjscKhbNALF4mQMA5aCRUBs9xzeu4BRFgPbxVhYFn4fx
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=[1,2,3,...]
```

---

## Decisions Locked
- **IDL file**: `backend/idl/bizfi_market.json`
- **Wallet integration**: Phantom-only
- **PDA seeds**:
  - Market PDA: `["market", market_id]`
  - User position PDA: `["position", market_id, user_pubkey]`
  - USDC vault PDA: `["vault", market_id]`
- **Frontend routing**: `/launch`, `/markets`, `/dashboard`

---

## Implemented (Frontend)
- Frontend now routes: `/`, `/markets`, `/launch`, `/dashboard`.
- UI buttons navigate and call backend endpoints.
- Chat posts to `http://localhost:8000/chat` via shared API helper.

## Next Proposed Work
- Use IDL to call on-chain instructions (write flows) now that PDA seeds are locked.

