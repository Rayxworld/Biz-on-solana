from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from agent import BizMartAgent
import time
from collections import defaultdict, deque

app = FastAPI(title="BizFun API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory rate limiter (per IP)
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 60
_ip_requests: dict[str, deque[float]] = defaultdict(deque)

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    q = _ip_requests[client_ip]
    # drop old entries
    while q and now - q[0] > RATE_LIMIT_WINDOW_SECONDS:
        q.popleft()
    if len(q) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    q.append(now)
    return await call_next(request)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class Market(BaseModel):
    id: int
    title: str
    question: str
    pool: str
    ends_in: str
    type: str
    yes_percentage: Optional[int] = 50
    no_percentage: Optional[int] = 50

class PdaRequest(BaseModel):
    market_id: str
    user_pubkey: Optional[str] = None

class CreateMarketRequest(BaseModel):
    question: str
    duration: int

class ResolveMarketRequest(BaseModel):
    market_pubkey: str
    outcome: bool

class PlaceBetRequest(BaseModel):
    market_pubkey: str
    user_pubkey: str
    user_usdc: str
    vault_usdc: str
    user_position: str
    amount: int
    bet_on_yes: bool

class ClaimWinningsRequest(BaseModel):
    market_pubkey: str
    user_pubkey: str
    user_usdc: str
    vault_usdc: str
    user_position: str

# Shared agent instance (for demo/prototype simplicity)
# In production, use session management
agent = BizMartAgent()

@app.get("/")
async def root():
    return {
        "message": "BizFun API",
        "version": "1.0.0",
        "status": "online"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint for interacting with the BizMart agent
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        response_text = await agent.chat(request.message)
        return ChatResponse(response=response_text)
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/markets", response_model=List[Market])
async def get_markets():
    """
    Get list of active prediction markets
    """
    return [
        Market(
            id=1,
            title="User Growth",
            question="Will this project reach 50k Twitter followers in 90 days?",
            pool="2,405 USDC",
            ends_in="14d",
            type="Social",
            yes_percentage=67,
            no_percentage=33
        ),
        Market(
            id=2,
            title="Revenue Milestone",
            question="Will this SaaS hit $3k MRR in 30 days?",
            pool="1,120 USDC",
            ends_in="7d",
            type="Revenue",
            yes_percentage=42,
            no_percentage=58
        ),
        Market(
            id=3,
            title="Product Launch",
            question="Will the MVP ship before Q2 2025?",
            pool="890 USDC",
            ends_in="21d",
            type="Product",
            yes_percentage=78,
            no_percentage=22
        )
    ]

@app.get("/stats")
async def get_stats():
    """
    Get platform statistics
    """
    return {
        "active_markets": 127,
        "total_volume": "45,200 USDC",
        "total_traders": 1834,
        "markets_resolved": 89
    }

@app.get("/program/status")
async def get_program_status():
    """
    Check deployed Solana program status
    """
    return await agent.orchestrator.get_program_status()

@app.get("/program/accounts")
async def get_program_accounts():
    """
    List program-owned accounts (read-only)
    """
    return await agent.orchestrator.get_program_accounts()

@app.post("/program/pdas")
async def get_program_pdas(request: PdaRequest):
    """
    Derive PDAs for market, user position, and vault.
    """
    result = {
        "market": agent.orchestrator.derive_market_pda(request.market_id),
        "vault": agent.orchestrator.derive_vault_pda(request.market_id),
    }
    if request.user_pubkey:
        result["user_position"] = agent.orchestrator.derive_user_position_pda(
            request.market_id,
            request.user_pubkey
        )
    return result

@app.post("/market/create")
async def create_market(request: CreateMarketRequest):
    """
    Initialize a new market on-chain (server signer).
    """
    return await agent.orchestrator.initialize_market(request.question, request.duration)

@app.post("/market/resolve")
async def resolve_market(request: ResolveMarketRequest):
    """
    Resolve a market on-chain (server signer).
    """
    return await agent.orchestrator.resolve_market(request.market_pubkey, request.outcome)

@app.post("/market/bet")
async def place_bet(request: PlaceBetRequest):
    """
    Place a bet on-chain (server signer for payer only).
    """
    return await agent.orchestrator.place_bet(
        request.market_pubkey,
        request.user_pubkey,
        request.user_usdc,
        request.vault_usdc,
        request.user_position,
        request.amount,
        request.bet_on_yes,
    )

@app.post("/market/claim")
async def claim_winnings(request: ClaimWinningsRequest):
    """
    Claim winnings on-chain (server signer for payer only).
    """
    return await agent.orchestrator.claim_winnings(
        request.market_pubkey,
        request.user_pubkey,
        request.user_usdc,
        request.vault_usdc,
        request.user_position,
    )

@app.post("/reset")
async def reset_agent():
    """
    Reset the agent conversation (for testing)
    """
    global agent
    agent = BizMartAgent()
    return {"message": "Agent reset successfully"}

@app.get("/state")
async def get_state():
    """
    Get current collection state for UI form view.
    """
    return agent.get_state()

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting BizFun API server...")
    print("📍 API will be available at: http://localhost:8000")
    print("📖 API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
