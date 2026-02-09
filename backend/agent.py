from solana_client import BizMartOrchestrator
import asyncio

load_dotenv()

class BizMartAgent:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o")
        self.orchestrator = BizMartOrchestrator()
        self.system_prompt = (
            "You are $BizMart, a savvy AI agent helping tokenize ideas, businesses, and careers. "
            "Your tone is energetic, professional but edgy, and encouraging. Use emojis like 👋, 😈, 🧠📈🔥. "
            "Follow this EXACT question sequence:\n"
            "1. Intro: 'Hey 👋 I’m $BizMart. I help tokenize ideas, businesses, and even careers... Ready?'\n"
            "2. Type: What are we tokenizing? (Business/Startup/Idea/Career/Experiment)\n"
            "3. Name & Socials: What should we call it? Include links so I can research.\n"
            "4. Description: Explain it in a few sentences (pitch to someone on X).\n"
            "5. Value/Audience: What value are you providing and who is your target audience?\n"
            "6. Stage: Be honest—what stage are you at? (Idea/Building/Launched/Making Money/Growing)\n"
            "7. Prediction: Let’s make this interesting 😈. What should the market predict? (Revenue/Sales/Growth/Followers)\n"
            "8. Specific Question: Write the prediction in plain English (e.g., 'Will this make $3k in 30 days?').\n"
            "9. Duration: 7, 14, or 30 days?\n"
            "10. Chain: What chain? (Base, Monad, BSC, or Solana)\n"
            "11. Vibe: Meme, Serious, or Experimental?\n"
            "12. Marketing: Can I market this publicly? (MoltBook, AI debates, Reply chaos, Chaos mode)\n"
            "13. Settlement: Drop a USDC address for settlement.\n"
            "14. Final confirm: Summarize and ask to fund the BizFun wallet with 10 USDC fee.\n\n"
            "Do not ask multiple questions at once. Keep it conversational. "
            "When the user mentions they have paid or ask to launch, if you have all data, type 'TRIGGER_LAUNCH'."
        )
        self.chat_history = [SystemMessage(content=self.system_prompt)]
        self.collected_data = {
            "name": None,
            "type": None,
            "chains": [],
            "wallet": None
        }

    async def chat(self, user_input: str):
        self.chat_history.append(HumanMessage(content=user_input))
        
        # Check if we should "launch"
        if "TRIGGER_LAUNCH" in user_input.upper() or "PAID" in user_input.upper():
            return await self._launch_sequence()

        response = await self.llm.ainvoke(self.chat_history)
        self.chat_history.append(response)
        self._extract_data_attempt(user_input, response.content)
        
        return response.content

    def _extract_data_attempt(self, user_text: str, bot_text: str):
        # Basic parsing for demo; in production use LLM function calling
        if "account" in bot_text.lower() or "wallet" in bot_text.lower():
             # Naive check for something that looks like an address
             if len(user_text) > 30:
                 self.collected_data["wallet"] = user_text
        if "call it" in bot_text.lower():
            self.collected_data["name"] = user_text
        if "chain" in bot_text.lower():
            for c in ["Solana", "Base", "Monad", "BSC"]:
                if c.lower() in user_text.lower() and c not in self.collected_data["chains"]:
                    self.collected_data["chains"].append(c)

    async def _launch_sequence(self):
        # 1. Verify payment
        paid = await self.orchestrator.check_fee_payment(self.collected_data.get("wallet", "Unknown"))
        if not paid:
            return "Hold up! I don't see the 10 USDC fee in the treasury yet. Double check the transaction? 🧐"

        # 2. Deploy
        sol_res = await self.orchestrator.deploy_on_solana(self.collected_data)
        other_res = await self.orchestrator.deploy_multi_chain(self.collected_data, self.collected_data["chains"])
        
        return (
            f"🚀 SAVVY! The engines are roaring! 🔥\n\n"
            f"✅ Solana: Created {sol_res['token']} and opened market {sol_res['market']}\n"
            f"✅ Multi-chain: Deployed stubs on {', '.join([r['chain'] for r in other_res])}\n\n"
            f"I'm now heading to MoltBook and X to start the chaos. Check your dashboard! 📈🧠"
        )

if __name__ == "__main__":
    agent = BizMartAgent()
    print("BizMart: Hello! I'm here to help you tokenize your business. What's the name of your project?")
    async def main():
        while True:
            user_in = input("You: ")
            if user_in.lower() in ["exit", "quit"]:
                break
            print(f"BizMart: {await agent.chat(user_in)}")
    asyncio.run(main())
