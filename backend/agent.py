from solana_client import BizMartOrchestrator
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage
import asyncio
import os

load_dotenv()

class BizMartAgent:
    def __init__(self):
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        openrouter_base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        openrouter_model = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free")
        if not openrouter_key:
            raise ValueError("OPENROUTER_API_KEY is not set in .env")
        self.llm = ChatOpenAI(
            model=openrouter_model,
            api_key=openrouter_key,
            base_url=openrouter_base,
            default_headers={
                "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:8000"),
                "X-Title": os.getenv("OPENROUTER_APP_NAME", "BizFun"),
            },
        )
        self.orchestrator = BizMartOrchestrator()
        self.system_prompt = (
            "You are $BizMart, a savvy AI agent helping tokenize ideas, businesses, and careers. "
            "Your tone is energetic, professional but edgy, and encouraging. Use emojis like 👋, 😈, 🧠, 📈, 🔥. "
            "Follow this EXACT question sequence:\n"
            "1. Intro: 'Hey 👋 I'm $BizMart. I help tokenize ideas, businesses, and even careers... Ready?'\n"
            "2. Type: What are we tokenizing? (Business/Startup/Idea/Career/Experiment)\n"
            "3. Name & Socials: What should we call it? Include links so I can research.\n"
            "4. Description: Explain it in a few sentences (pitch to someone on X).\n"
            "5. Value/Audience: What value are you providing and who is your target audience?\n"
            "6. Stage: Be honest—what stage are you at? (Idea/Building/Launched/Making Money/Growing)\n"
            "7. Prediction: Let's make this interesting 😈. What should the market predict? (Revenue/Sales/Growth/Followers)\n"
            "8. Specific Question: Write the prediction in plain English (e.g., 'Will this make $3k in 30 days?').\n"
            "9. Duration: 7, 14, or 30 days?\n"
            "10. Chain: What chain? (Base, Monad, BSC, or Solana)\n"
            "11. Vibe: Meme, Serious, or Experimental?\n"
            "12. Marketing: Can I market this publicly? (MoltBook, AI debates, Reply chaos, Chaos mode)\n"
            "13. Settlement: Drop a USDC address for settlement.\n"
            "14. Final confirm: Summarize and ask to fund the BizFun wallet with 10 USDC fee.\n\n"
            "Do not ask multiple questions at once. Keep it conversational. "
            "When the user mentions they have paid or asks to launch, if you have all data, type 'TRIGGER_LAUNCH'."
        )
        self.chat_history = [SystemMessage(content=self.system_prompt)]
        self.collected_data = {
            "type": None,
            "name": None,
            "socials": None,
            "description": None,
            "value_audience": None,
            "stage": None,
            "prediction_type": None,
            "prediction_question": None,
            "duration": None,
            "chain": None,
            "vibe": None,
            "marketing": None,
            "wallet": None,
        }
        # Step index (1-based) for deterministic flow after intro
        self.step = 1
        self.flow_questions = [
            "2️⃣ Type: What are we tokenizing? (Business / Startup / Idea / Career / Experiment)",
            "3️⃣ Name & Socials: What should we call it? Drop name + links (X, LinkedIn, website).",
            "4️⃣ Description: Give me a short pitch (a few sentences) you’d use on X.",
            "5️⃣ Value & Audience: What exact value do you deliver and who is the core audience?",
            "6️⃣ Stage: Be honest—what stage are you at? (Idea / Building / Launched / Making Money / Growing)",
            "7️⃣ Prediction: What should the market predict? (Revenue / Sales / Growth / Followers)",
            "8️⃣ Specific Question: Write the prediction in plain English (e.g., 'Will this make $3k in 30 days?').",
            "9️⃣ Duration: 7, 14, or 30 days?",
            "10️⃣ Chain: Base, Monad, BSC, or Solana?",
            "11️⃣ Vibe: Meme, Serious, or Experimental?",
            "12️⃣ Marketing: Can I market this publicly? (MoltBook, AI debates, Reply chaos, Chaos mode)",
            "13️⃣ Settlement: Drop a USDC address for settlement.",
            "14️⃣ Final confirm: I’ll summarize—reply 'confirm' to launch and fund the BizFun wallet with 10 USDC fee."
        ]

    async def chat(self, user_input: str):
        self.chat_history.append(HumanMessage(content=user_input))
        
        # Check if we should launch
        if "TRIGGER_LAUNCH" in user_input.upper():
            return await self._launch_sequence()
        if ("PAID" in user_input.upper() or "LAUNCH" in user_input.upper() or "CONFIRM" in user_input.upper()) and self._ready_to_launch():
            return await self._launch_sequence()
        # Hybrid flow: store data deterministically, but use LLM to add tone.
        self._store_answer(user_input)
        self._fast_forward_step()

        # If ready, return summary
        if self._ready_to_launch():
            return self._next_question()

        # Otherwise ask the next missing question with LLM flavor
        base_question = self._next_question()
        prompt = (
            "Rewrite the following question in a friendly, energetic tone (1-2 sentences). "
            "Do not change its meaning or add new questions. Output only the rewritten question.\n\n"
            f"Question: {base_question}"
        )
        try:
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            return response.content.strip()
        except Exception:
            return base_question

    def _ready_to_launch(self) -> bool:
        required = ["name", "wallet", "prediction_question", "duration", "chain"]
        return all(self.collected_data.get(k) for k in required)

    def _store_answer(self, user_input: str):
        # Store answer from previous step based on step index
        mapping = {
            1: "type",
            2: "name",
            3: "description",
            4: "value_audience",
            5: "stage",
            6: "prediction_type",
            7: "prediction_question",
            8: "duration",
            9: "chain",
            10: "vibe",
            11: "marketing",
            12: "wallet",
        }
        key = mapping.get(self.step)
        if key:
            self.collected_data[key] = user_input.strip()
        # Parse labeled input to reduce strictness
        lowered = user_input.lower()
        if "name:" in lowered:
            self.collected_data["name"] = user_input.split(":", 1)[1].strip()
        if "twitter" in lowered or "http" in lowered:
            self.collected_data["socials"] = user_input.strip()
        if "audience" in lowered or "value" in lowered:
            self.collected_data["value_audience"] = user_input.strip()
        if "stage" in lowered:
            self.collected_data["stage"] = user_input.strip()
        if "predict" in lowered:
            self.collected_data["prediction_type"] = user_input.strip()
        if "will we" in lowered or "?" in lowered:
            self.collected_data["prediction_question"] = user_input.strip()
        if "duration" in lowered:
            self.collected_data["duration"] = user_input.strip()
        if "chain" in lowered or "solana" in lowered or "base" in lowered or "bsc" in lowered:
            self.collected_data["chain"] = user_input.strip()
        if "vibe" in lowered or "meme" in lowered or "serious" in lowered:
            self.collected_data["vibe"] = user_input.strip()
        if "marketing" in lowered:
            self.collected_data["marketing"] = user_input.strip()
        if "wallet" in lowered or "usdc" in lowered:
            self.collected_data["wallet"] = user_input.strip()

    def _fast_forward_step(self):
        # Move step to the first missing field
        order = [
            "type",
            "name",
            "description",
            "value_audience",
            "stage",
            "prediction_type",
            "prediction_question",
            "duration",
            "chain",
            "vibe",
            "marketing",
            "wallet",
        ]
        for i, key in enumerate(order, start=1):
            if not self.collected_data.get(key):
                self.step = i
                return
        self.step = len(self.flow_questions) + 1

    def _next_question(self) -> str:
        # Advance step and return next question
        if self.step < len(self.flow_questions):
            q = self.flow_questions[self.step - 1]
            self.step += 1
            return q
        # Final summary placeholder
        summary = (
            "Summary:\n"
            f"- Type: {self.collected_data.get('type')}\n"
            f"- Name: {self.collected_data.get('name')}\n"
            f"- Description: {self.collected_data.get('description')}\n"
            f"- Audience/Value: {self.collected_data.get('value_audience')}\n"
            f"- Stage: {self.collected_data.get('stage')}\n"
            f"- Prediction: {self.collected_data.get('prediction_question')}\n"
            f"- Duration: {self.collected_data.get('duration')}\n"
            f"- Chain: {self.collected_data.get('chain')}\n"
            f"- Vibe: {self.collected_data.get('vibe')}\n"
            f"- Marketing: {self.collected_data.get('marketing')}\n"
            f"- Settlement Wallet: {self.collected_data.get('wallet')}\n\n"
            "Reply 'confirm' to launch and fund the BizFun wallet with 10 USDC fee."
        )
        return summary

    def _extract_data_attempt(self, user_text: str, bot_text: str):
        """Basic parsing for demo; in production use LLM function calling"""
        # Extract wallet address
        if "account" in bot_text.lower() or "wallet" in bot_text.lower() or "address" in bot_text.lower():
            if len(user_text) > 30 and user_text[0].isalnum():
                self.collected_data["wallet"] = user_text.strip()
        
        # Extract name
        if "call it" in bot_text.lower() or "name" in bot_text.lower():
            if len(user_text) < 100:
                self.collected_data["name"] = user_text.strip()
        
        # Extract chains
        for c in ["Solana", "Base", "Monad", "BSC"]:
            if c.lower() in user_text.lower() and c not in self.collected_data["chains"]:
                self.collected_data["chains"].append(c)
        
        # Extract duration
        for duration in ["7", "14", "30"]:
            if duration in user_text and "days" in user_text.lower():
                self.collected_data["duration"] = f"{duration} days"
        
        # Extract vibe
        for vibe in ["meme", "serious", "experimental"]:
            if vibe in user_text.lower():
                self.collected_data["vibe"] = vibe.capitalize()

    async def _launch_sequence(self):
        # 1. Verify payment (mock for demo)
        paid = await self.orchestrator.check_fee_payment(self.collected_data.get("wallet", "Unknown"))
        if not paid:
            return "Hold up! I don't see the 10 USDC fee in the treasury yet. Double check the transaction? 🧐"

        # 2. Deploy on Solana
        sol_res = await self.orchestrator.deploy_on_solana(self.collected_data)
        
        # 3. Deploy on other chains
        other_chains = [c for c in self.collected_data["chains"] if c != "Solana"]
        other_res = await self.orchestrator.deploy_multi_chain(self.collected_data, other_chains) if other_chains else []
        
        # Build response
        response = (
            f"🚀 SAVVY! The engines are roaring! 🔥\n\n"
            f"✅ Solana: Created token {sol_res['token']} and opened market {sol_res['market']}\n"
        )
        
        if other_res:
            response += f"✅ Multi-chain: Deployed stubs on {', '.join([r['chain'] for r in other_res])}\n\n"
        
        response += (
            f"\nI'm now heading to MoltBook and X to start the chaos. "
            f"Check your dashboard! 📈🧠"
        )
        
        return response

if __name__ == "__main__":
    agent = BizMartAgent()
    print("BizMart: Hello! I'm here to help you tokenize your business. What's the name of your project?")
    
    async def main():
        while True:
            user_in = input("You: ")
            if user_in.lower() in ["exit", "quit"]:
                break
            response = await agent.chat(user_in)
            print(f"BizMart: {response}")
    
    asyncio.run(main())
