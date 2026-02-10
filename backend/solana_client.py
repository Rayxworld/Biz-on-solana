import os
import json
import asyncio
from solana.rpc.async_api import AsyncClient
from solana.rpc.types import TxOpts
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.pubkey import Pubkey as _Pubkey
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from dotenv import load_dotenv
from anchorpy import Context, Idl, Program, Provider, Wallet

load_dotenv()

class BizMartOrchestrator:
    """
    Handles Solana blockchain interactions for BizFun markets
    """
    
    def __init__(self):
        self.rpc_url = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
        self.client = AsyncClient(self.rpc_url)
        self.program_id_str = os.getenv("SOLANA_PROGRAM_ID")
        self.program_id = None
        self.idl_path = os.getenv(
            "IDL_PATH",
            os.path.join(os.path.dirname(__file__), "idl", "bizfun_market.json")
        )
        self._program = None
        if self.program_id_str:
            try:
                self.program_id = Pubkey.from_string(self.program_id_str)
            except Exception as e:
                print(f"Warning: Invalid SOLANA_PROGRAM_ID: {e}")
        
        # Load keypair from environment
        key_str = os.getenv("SOLANA_PRIVATE_KEY")
        if key_str:
            try:
                key_bytes = bytes(json.loads(key_str))
                self.payer = Keypair.from_bytes(key_bytes)
            except Exception as e:
                print(f"Warning: Could not load keypair from env: {e}")
                self.payer = Keypair()  # Fallback to random for testing
        else:
            print("Warning: No SOLANA_PRIVATE_KEY in .env, using random keypair")
            self.payer = Keypair()

        # SPL Token Program (official)
        self.token_program_id = _Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")

    async def _get_program(self) -> Program:
        if self._program:
            return self._program
        if not self.program_id:
            raise ValueError("SOLANA_PROGRAM_ID not set or invalid")
        if not os.path.exists(self.idl_path):
            raise FileNotFoundError(f"IDL not found at {self.idl_path}")

        with open(self.idl_path, "r", encoding="utf-8") as f:
            idl = Idl.from_json(f.read())

        provider = Provider(self.client, Wallet(self.payer), opts=TxOpts(preflight_commitment="confirmed"))
        self._program = Program(idl, self.program_id, provider)
        return self._program

    def _pubkey(self, value: str) -> Pubkey:
        return Pubkey.from_string(value)

    async def check_fee_payment(self, user_wallet: str) -> bool:
        """
        Check if the user has sent 10 USDC to the BizFun treasury.
        
        Args:
            user_wallet: The user's wallet address
            
        Returns:
            bool: True if payment confirmed, False otherwise
        """
        print(f"Checking 10 USDC fee from {user_wallet}...")
        
        # TODO: Implement actual USDC transfer verification
        # This would involve:
        # 1. Query recent transactions to treasury address
        # 2. Verify amount is 10 USDC
        # 3. Verify sender is user_wallet
        
        # For MVP/demo, return True
        await asyncio.sleep(0.5)  # Simulate API call
        return True

    async def deploy_on_solana(self, data: dict) -> dict:
        """
        Deploy prediction market on Solana
        
        Args:
            data: Market data including name, question, duration, etc.
            
        Returns:
            dict: Deployment result with token and market addresses
        """
        print(f"Deploying {data.get('name', 'Market')} on Solana...")
        
        # TODO: Implement actual Solana deployment
        # This would involve:
        # 1. Create SPL token for the business
        # 2. Initialize prediction market account via Anchor
        # 3. Set up token accounts and vaults
        
        # For MVP/demo, return mock data
        await asyncio.sleep(1)  # Simulate deployment time
        
        name = data.get('name') or 'Market'
        token_mint = f"Biz{name[:3].upper()}Mock123"
        market_address = f"Market_{name.replace(' ', '_')}_ABC123"
        
        return {
            "chain": "Solana",
            "token": token_mint,
            "market": market_address,
            "status": "deployed"
        }

    async def deploy_multi_chain(self, data: dict, chains: list) -> list:
        """
        Deploy stubs/integrations on other chains
        
        Args:
            data: Market data
            chains: List of chain names to deploy on
            
        Returns:
            list: Deployment results for each chain
        """
        results = []
        
        for chain in chains:
            print(f"Orchestrating deployment on {chain}...")
            await asyncio.sleep(0.5)  # Simulate API calls
            
            if chain.lower() == "base":
                results.append({
                    "chain": "Base",
                    "platform": "Clanker",
                    "status": "Deployed",
                    "address": f"0xBase{data.get('name', '')[:6]}..."
                })
            elif chain.lower() == "bsc":
                results.append({
                    "chain": "BSC",
                    "platform": "four.meme",
                    "status": "Deployed",
                    "address": f"0xBSC{data.get('name', '')[:6]}..."
                })
            elif chain.lower() == "monad":
                results.append({
                    "chain": "Monad",
                    "platform": "nad.fun",
                    "status": "Deployed",
                    "address": f"0xMonad{data.get('name', '')[:6]}..."
                })
        
        return results

    async def get_market_data(self, market_address: str) -> dict:
        """
        Fetch market data from Solana
        
        Args:
            market_address: The market's public key
            
        Returns:
            dict: Market data including pools, status, etc.
        """
        print(f"Fetching market data for {market_address}...")
        
        # TODO: Implement actual on-chain data fetching
        await asyncio.sleep(0.3)
        
        return {
            "address": market_address,
            "total_pool": 2405,
            "yes_pool": 1611,
            "no_pool": 794,
            "status": "active",
            "end_time": 1234567890
        }

    async def get_program_status(self) -> dict:
        """
        Verify program account exists and basic metadata.
        """
        if not self.program_id:
            return {"program_id": self.program_id_str, "exists": False, "error": "SOLANA_PROGRAM_ID not set or invalid"}

        resp = await self.client.get_account_info(self.program_id)
        value = resp.value
        if value is None:
            return {"program_id": str(self.program_id), "exists": False}

        return {
            "program_id": str(self.program_id),
            "exists": True,
            "executable": value.executable,
            "owner": str(value.owner),
            "lamports": value.lamports,
        }

    async def get_program_accounts(self) -> dict:
        """
        Fetch program-owned accounts (read-only).
        """
        if not self.program_id:
            return {"program_id": self.program_id_str, "accounts": [], "error": "SOLANA_PROGRAM_ID not set or invalid"}

        resp = await self.client.get_program_accounts(self.program_id)
        accounts = [
            {"pubkey": str(a.pubkey), "lamports": a.account.lamports, "owner": str(a.account.owner)}
            for a in resp.value
        ]
        return {"program_id": str(self.program_id), "accounts": accounts}

    def derive_market_pda(self, market_id: str) -> dict:
        """
        Derive Market PDA using seeds: ["market", market_id]
        """
        if not self.program_id:
            return {"error": "SOLANA_PROGRAM_ID not set or invalid"}
        seeds = [b"market", market_id.encode("utf-8")]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return {"pda": str(pda), "bump": bump}

    def derive_user_position_pda(self, market_id: str, user_pubkey: str) -> dict:
        """
        Derive UserPosition PDA using seeds: ["position", market_id, user_pubkey]
        """
        if not self.program_id:
            return {"error": "SOLANA_PROGRAM_ID not set or invalid"}
        user_pk = Pubkey.from_string(user_pubkey)
        seeds = [b"position", market_id.encode("utf-8"), bytes(user_pk)]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return {"pda": str(pda), "bump": bump}

    def derive_vault_pda(self, market_id: str) -> dict:
        """
        Derive USDC Vault PDA using seeds: ["vault", market_id]
        """
        if not self.program_id:
            return {"error": "SOLANA_PROGRAM_ID not set or invalid"}
        seeds = [b"vault", market_id.encode("utf-8")]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return {"pda": str(pda), "bump": bump}

    async def initialize_market(self, question: str, duration: int) -> dict:
        """
        Initialize a new market using the on-chain program.
        """
        program = await self._get_program()
        market_kp = Keypair()
        ctx = Context(
            accounts={
                "market": market_kp.pubkey(),
                "creator": self.payer.pubkey(),
                "system_program": SYS_PROGRAM_ID,
            },
            signers=[self.payer, market_kp],
        )

        rpc = program.rpc
        method = rpc["initialize_market"] if "initialize_market" in rpc else rpc["initializeMarket"]
        sig = await method(question, duration, ctx=ctx)
        return {"signature": str(sig), "market_pubkey": str(market_kp.pubkey())}

    async def resolve_market(self, market_pubkey: str, outcome: bool) -> dict:
        program = await self._get_program()
        ctx = Context(
            accounts={
                "market": self._pubkey(market_pubkey),
                "authority": self.payer.pubkey(),
            },
            signers=[self.payer],
        )
        rpc = program.rpc
        method = rpc["resolve_market"] if "resolve_market" in rpc else rpc["resolveMarket"]
        sig = await method(outcome, ctx=ctx)
        return {"signature": str(sig), "market_pubkey": market_pubkey}

    async def place_bet(
        self,
        market_pubkey: str,
        user_pubkey: str,
        user_usdc: str,
        vault_usdc: str,
        user_position: str,
        amount: int,
        bet_on_yes: bool,
    ) -> dict:
        """
        Place a bet. For now this only supports server signing when user_pubkey is the payer.
        """
        if str(self.payer.pubkey()) != user_pubkey:
            return {"error": "Backend can only sign for payer. Use client-side signing for user bets."}
        program = await self._get_program()
        ctx = Context(
            accounts={
                "market": self._pubkey(market_pubkey),
                "user": self.payer.pubkey(),
                "user_usdc": self._pubkey(user_usdc),
                "vault_usdc": self._pubkey(vault_usdc),
                "user_position": self._pubkey(user_position),
                "token_program": self.token_program_id,
                "system_program": SYS_PROGRAM_ID,
            },
            signers=[self.payer],
        )
        rpc = program.rpc
        method = rpc["place_bet"] if "place_bet" in rpc else rpc["placeBet"]
        sig = await method(amount, bet_on_yes, ctx=ctx)
        return {"signature": str(sig), "market_pubkey": market_pubkey}

    async def claim_winnings(
        self,
        market_pubkey: str,
        user_pubkey: str,
        user_usdc: str,
        vault_usdc: str,
        user_position: str,
    ) -> dict:
        """
        Claim winnings. Only supports server signing when user_pubkey is the payer.
        """
        if str(self.payer.pubkey()) != user_pubkey:
            return {"error": "Backend can only sign for payer. Use client-side signing for user claims."}
        program = await self._get_program()
        ctx = Context(
            accounts={
                "market": self._pubkey(market_pubkey),
                "user": self.payer.pubkey(),
                "user_usdc": self._pubkey(user_usdc),
                "vault_usdc": self._pubkey(vault_usdc),
                "user_position": self._pubkey(user_position),
                "token_program": self.token_program_id,
            },
            signers=[self.payer],
        )
        rpc = program.rpc
        method = rpc["claim_winnings"] if "claim_winnings" in rpc else rpc["claimWinnings"]
        sig = await method(ctx=ctx)
        return {"signature": str(sig), "market_pubkey": market_pubkey}

    async def close(self):
        """Close the RPC client connection"""
        await self.client.close()


# Utility functions for interacting with Solana

async def create_token_mint(
    client: AsyncClient,
    payer: Keypair,
    decimals: int = 9
) -> Pubkey:
    """
    Create a new SPL token mint
    
    Args:
        client: Solana RPC client
        payer: Keypair paying for the transaction
        decimals: Number of decimals for the token
        
    Returns:
        Pubkey: The mint address
    """
    # TODO: Implement token mint creation
    pass


async def initialize_market_account(
    client: AsyncClient,
    payer: Keypair,
    question: str,
    duration: int
) -> Pubkey:
    """
    Initialize a new prediction market account
    
    Args:
        client: Solana RPC client
        payer: Keypair paying for the transaction
        question: The prediction question
        duration: Market duration in seconds
        
    Returns:
        Pubkey: The market account address
    """
    # TODO: Implement market initialization via Anchor
    pass


# Example usage
if __name__ == "__main__":
    async def test():
        orchestrator = BizMartOrchestrator()
        
        # Test data
        test_data = {
            "name": "TestProject",
            "type": "Startup",
            "chains": ["Solana", "Base"],
            "wallet": "TestWallet123"
        }
        
        # Test fee check
        paid = await orchestrator.check_fee_payment(test_data["wallet"])
        print(f"Fee paid: {paid}")
        
        # Test Solana deployment
        sol_result = await orchestrator.deploy_on_solana(test_data)
        print(f"Solana deployment: {sol_result}")
        
        # Test multi-chain deployment
        other_chains = ["Base"]
        multi_result = await orchestrator.deploy_multi_chain(test_data, other_chains)
        print(f"Multi-chain deployment: {multi_result}")
        
        await orchestrator.close()
    
    asyncio.run(test())
