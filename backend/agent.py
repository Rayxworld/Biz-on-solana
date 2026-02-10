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
            "chains": [],
        }
        # Step index (1-based) for deterministic flow after intro
        self.step = 1
        self.flow_questions = [
            "Type: Business | Startup | Idea | Career | Experiment",
            "Name: <project name>",
            "Socials: <X / LinkedIn / website links>",
            "Description: <short pitch>",
            "Audience/Value: <who + value delivered>",
            "Stage: Idea | Building | Launched | Making Money | Growing",
            "Prediction: Revenue | Sales | Growth | Followers",
            "Question: <plain English prediction>",
            "Duration: 7 | 14 | 30 days",
            "Chain: Solana | Base | Monad | BSC",
            "Vibe: Meme | Serious | Experimental",
            "Marketing: MoltBook | AI debates | Reply chaos | Chaos mode",
            "Wallet: <USDC address>",
            "Confirm: type confirm to launch"
        ]
        self._intro_sent = True

    async def chat(self, user_input: str):
        self.chat_history.append(HumanMessage(content=user_input))

        # Allow explicit reset
        if user_input.strip().lower() in {"reset", "start over", "restart"}:
            self.reset_state()
            return self.flow_questions[0]

        # If user says ready at the start and we have little data, reset to first question
        if "ready" in user_input.lower() and self._filled_count() <= 1:
            self.reset_state()
            return self.flow_questions[0]
        
        # Check if we should launch
        if "TRIGGER_LAUNCH" in user_input.upper():
            return await self._launch_sequence()
        if ("PAID" in user_input.upper() or "LAUNCH" in user_input.upper() or "CONFIRM" in user_input.upper()) and self._ready_to_launch():
            return await self._launch_sequence()
        # Hybrid flow: store data deterministically, but use LLM to add tone.
        # Strict mode: enforce one labeled field per message
        strict_result = self._store_answer_strict(user_input)
        if strict_result:
            return strict_result
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

    def _filled_count(self) -> int:
        return sum(1 for v in self.collected_data.values() if v)

    def reset_state(self):
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
            "chains": [],
        }
        self.step = 1

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
        # Parse labeled lines like "Name: BizFun AI"
        # Non-strict parsing removed in strict mode

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
            "Type confirm to launch and fund the BizFun wallet with 10 USDC fee."
        )
        return summary

    def _store_answer_strict(self, user_input: str) -> str | None:
        import re
        label_pattern = re.compile(
            r"^\s*(Type|Name|Socials|Description|Audience/Value|Audience|Value|Stage|Prediction|Question|Duration|Chain|Vibe|Marketing|Wallet|Settlement)\s*:\s*(.+)$",
            re.IGNORECASE,
        )
        lines = [line.strip() for line in user_input.splitlines() if line.strip()]
        if len(lines) != 1:
            return "Please answer one field at a time in the format: Field: value"
        match = label_pattern.match(lines[0])
        if not match:
            return "Strict mode: use Field: value (e.g., Type: Business)"
        label = match.group(1).strip().lower()
        value = match.group(2).strip()
        label_map = {
            "type": "type",
            "name": "name",
            "socials": "socials",
            "description": "description",
            "audience": "value_audience",
            "value": "value_audience",
            "audience/value": "value_audience",
            "stage": "stage",
            "prediction": "prediction_type",
            "question": "prediction_question",
            "duration": "duration",
            "chain": "chain",
            "vibe": "vibe",
            "marketing": "marketing",
            "wallet": "wallet",
            "settlement": "wallet",
        }
        key = label_map.get(label)
        if not key:
            return "Unknown field. Please use a supported label."
        # Enforce the expected field for the current step
        expected_order = [
            "type",
            "name",
            "socials",
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
        expected_key = expected_order[self.step - 1] if 1 <= self.step <= len(expected_order) else None
        if expected_key and key != expected_key:
            label_display = self.flow_questions[self.step - 1]
            return f"Please answer the current field only: {label_display}"
        self.collected_data[key] = value
        return None
    def get_state(self) -> dict:
        order = [
            "type",
            "name",
            "socials",
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
        missing = [k for k in order if not self.collected_data.get(k)]
        return {"collected": self.collected_data, "missing": missing}

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

        # Ensure chains list from selected chain
        if not self.collected_data.get("chains"):
            chain = self.collected_data.get("chain") or "Solana"
            self.collected_data["chains"] = [chain]

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
