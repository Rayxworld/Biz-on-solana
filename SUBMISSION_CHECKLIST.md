# Hackathon Submission Checklist

## 1) Evaluation Criteria Coverage

### AI Integration and Intelligence
- [ ] AI materially changes product behavior (not cosmetic text only)
- [ ] AI uses live on-chain inputs (market pools, odds, timing, position)
- [ ] AI output is structured and actionable (`suggested_side`, `suggested_amount`, `confidence`, `reasoning`, `risk_score`)
- [ ] AI behavior is reliable (schema validation + fallback behavior on parse failure)
- [ ] Agent is predictive/decision-support oriented, not purely reactive

### Execution and Technical Quality
- [ ] MVP runs end-to-end without manual code edits during demo
- [ ] Solana integration works (`/api/markets`, `/api/trade/prepare`, `/api/trade/submit`)
- [ ] Inference pipeline works (`/api/ai/analyze`)
- [ ] Error handling and startup checks are present (`/api/health`, `/api/program/startup-check`)
- [ ] Core scalability controls exist (rate limits, request validation, bounded payloads)

### Product Experience and User Value
- [ ] User can discover market -> analyze -> execute in one coherent flow
- [ ] UI clearly presents confidence/risk and guardrail pass/block reasons
- [ ] The product solves a real user problem (bet sizing/risk support for prediction markets)
- [ ] Interaction is understandable for first-time demo users

### Safety and Guardrails
- [ ] Non-custodial model is enforced (wallet signs, backend does not custody)
- [ ] Signed transaction is verified before submission
- [ ] Guardrails are explicit and testable (confidence/allocation/risk budget/whitelist)
- [ ] Unsafe/invalid actions are blocked with clear user-facing errors

### Launch Readiness and Growth Potential
- [ ] Launch plan exists (deployment + go-to-market + token utility)
- [ ] Clear link between AI utility and token utility
- [ ] Post-hackathon scaling path documented (infra, data, growth, controls)

## 2) Submission Requirements Coverage

### Mandatory Deliverables
- [ ] Working AI-powered MVP integrated with Solana
- [ ] AI agent/model/workflow that interacts with on-chain data/logic
- [ ] Functional inference pipeline and/or agent framework
- [ ] Live frontend/demo interface
- [ ] DeAura token launch link
- [ ] Documentation of AI architecture, safety, and token utility
- [ ] Demo video
- [ ] Pitch outlining launch plan

### Eligibility / Compliance
- [ ] Token launched via DeAura
- [ ] Project reached required trading volume threshold
- [ ] Reused/open-source code disclosures included
- [ ] No malicious behavior, plagiarism, or wash trading

## 3) Technical Readiness Checks (Project-Specific)

### Runtime
- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:5173`
- [ ] `GET /api/health` returns `status: ok`
- [ ] `GET /api/program/startup-check` returns valid IDL + program checks

### Environment
- [ ] `backend-node/.env` exists
- [ ] `SOLANA_PROGRAM_ID` is correct
- [ ] `SOLANA_IDL_PATH` points to `../contracts/target/idl/bizfi_market.json`
- [ ] `OPENAI_API_KEY` is set for AI demo path
- [ ] Optional integrations set if used (`HELIUS_API_KEY`, `SUPABASE_*`)

### Contract/IDL Consistency
- [ ] Program naming is canonicalized to `bizfi_market` in docs and runtime config
- [ ] PDA seed encoding is documented as `u64` LE bytes
- [ ] Canonical runtime IDL is only from `contracts/target/idl/bizfi_market.json`

## 4) Demo Script (Fast Path)

- [ ] Connect Phantom wallet
- [ ] Open markets list
- [ ] Enter one market detail page
- [ ] Run AI analysis
- [ ] Show guardrail result (allowed/blocked)
- [ ] Prepare trade transaction
- [ ] Sign via wallet
- [ ] Submit and open explorer link

## 5) Browser Wallet Troubleshooting (for Judges)

- [ ] Ignore extension console noise from unrelated wallets (e.g. MetaMask inpage logs)
- [ ] Confirm app uses Phantom path (`window.solana`) for wallet flow
- [ ] If backend API errors appear, verify backend process is running on port `3001`
