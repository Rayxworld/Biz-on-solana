import os
import json
import asyncio
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from anchorpy import Program, Provider, Wallet, Context
from dotenv import load_dotenv

load_dotenv()

class BizMartOrchestrator:
    def __init__(self):
        self.rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
        self.client = AsyncClient(self.rpc_url)
        
        # Load keypair
        key_str = os.getenv("SOLANA_PRIVATE_KEY")
        if key_str:
            key_bytes = bytes(json.loads(key_str))
            self.payer = Keypair.from_bytes(key_bytes)
        else:
            self.payer = Keypair() # Fallback to random for testing
            
        self.wallet = Wallet(self.payer)
        self.provider = Provider(self.client, self.wallet)

    async def check_fee_payment(self, user_wallet: str):
        """
        Check if the user has sent 10 USDC to the BizFun treasury.
        For MVP, we check the last few transactions to the treasury from this user_wallet.
        """
        print(f"Checking 10 USDC fee from {user_wallet}...")
        # Mocking success for the prototype
        return True

    async def deploy_on_solana(self, data: dict):
        """
        1. Create SPL Token (Business Token)
        2. Initialize Prediction Market on Solana
        """
        print(f"Deploying {data['name']} on Solana...")
        # In a real scenario, we'd use spl-token instructions or CPI
        token_mint = "Biz" + data['name'][:3].upper() + "v1" # Mock address
        
        # Example Anchor call (assuming IDL is loaded)
        # program = await Program.at(Pubkey.from_string("BizFunMarket1111111111111111111111111111111"), self.provider)
        # await program.rpc["initialize_market"](...)
        
        return {
            "chain": "Solana",
            "token": token_mint,
            "market": f"Market_{data['name'].replace(' ', '_')}"
        }

    async def deploy_multi_chain(self, data: dict, chains: list):
        """
        Stubs for the other chains mentioned in PRD.
        """
        results = []
        for chain in chains:
            print(f"Orchestrating deployment on {chain}...")
            if chain.lower() == "base":
                results.append({"chain": "Base", "platform": "Clanker", "status": "Deployed"})
            elif chain.lower() == "bsc":
                results.append({"chain": "BSC", "platform": "four.meme", "status": "Deployed"})
            elif chain.lower() == "monad":
                results.append({"chain": "Monad", "platform": "nad.fun", "status": "Deployed"})
        return results

    async def close(self):
        await self.client.close()
