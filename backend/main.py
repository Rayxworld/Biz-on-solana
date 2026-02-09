from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from agent import BizMartAgent
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

# Shared agent instance (for demo/prototype simplicity)
agent = BizMartAgent()

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        response_text = await agent.chat(request.message)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/markets")
async def get_markets():
    # Placeholder for market listing logic
    return [
        {
            "id": 1,
            "title": "CyberTruck SaaS ARR",
            "question": "Will 'CyberTruck SaaS' hit $10k ARR by Q3?",
            "pool": "1,200 USDC",
            "ends_in": "5d",
            "type": "Startup"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
