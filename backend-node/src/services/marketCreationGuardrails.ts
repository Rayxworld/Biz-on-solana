const dailyCreateCounter: Map<string, { date: string; count: number }> = new Map();
const recentQuestions: Map<string, number> = new Map();

function today(): string {
  return new Date().toISOString().split("T")[0]!;
}

function normalizeQuestion(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function enforceMarketCreationGuardrails(params: {
  userPubkey: string;
  question: string;
  durationSeconds: number;
  creatorType: "human" | "agent";
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const question = params.question.trim();
  const normalized = normalizeQuestion(question);

  if (question.length < 15) reasons.push("Question is too short (min 15 chars).");
  if (question.length > 220) reasons.push("Question is too long (max 220 chars).");
  if (!question.endsWith("?")) reasons.push("Question should end with a '?'.");
  if (!/^will\s/i.test(question)) {
    reasons.push("Question should start with 'Will ...' for binary market clarity.");
  }

  if (/https?:\/\//i.test(question)) reasons.push("Question cannot include URLs.");
  if (/(.)\1{4,}/.test(question)) reasons.push("Question appears spammy.");
  if (/pump|moon|100x|guaranteed|insider/i.test(question)) {
    reasons.push("Question contains disallowed hype/manipulation terms.");
  }

  if (params.durationSeconds < 60 * 60) reasons.push("Duration must be at least 1 hour.");
  if (params.durationSeconds > 60 * 60 * 24 * 30) {
    reasons.push("Duration must be 30 days or less for MVP.");
  }

  const counter = dailyCreateCounter.get(params.userPubkey);
  const countToday = counter && counter.date === today() ? counter.count : 0;
  const limit = params.creatorType === "agent" ? 6 : 4;
  if (countToday >= limit) {
    reasons.push(`Daily market creation limit reached (${limit}/day).`);
  }

  const seenAt = recentQuestions.get(normalized);
  if (seenAt && Date.now() - seenAt < 1000 * 60 * 60 * 24) {
    reasons.push("Duplicate question submitted recently.");
  }

  const allowed = reasons.length === 0;
  if (allowed) {
    dailyCreateCounter.set(params.userPubkey, { date: today(), count: countToday + 1 });
    recentQuestions.set(normalized, Date.now());
  }
  return { allowed, reasons };
}
