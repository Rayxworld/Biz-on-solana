import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/index.js";
import type { AnalysisResult } from "../ai/agent.js";

let supabase: SupabaseClient | null = null;
let logsTableAvailable = true;
const inMemoryLogs: any[] = [];

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;

  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn(
      "Supabase not configured. AI logs will only be written to console (demo mode)."
    );
    return null;
  }

  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  return supabase;
}

function isMissingLogsTableError(message: string): boolean {
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

export async function logAnalysis(
  marketId: number,
  userPubkey: string,
  result: AnalysisResult
): Promise<void> {
  const logEntry = {
    market_id: marketId,
    user_pubkey: userPubkey,
    analysis_json: result.analysis,
    observability: result.observability,
    guardrail_result: {
      allowed: result.guardrails.allowed,
      reasons: result.guardrails.reasons,
    },
    action_taken: result.guardrails.allowed
      ? result.analysis.suggested_side
      : "blocked",
    market_data_snapshot: result.marketData,
    created_at: result.timestamp,
  };
  inMemoryLogs.unshift(logEntry);
  if (inMemoryLogs.length > 200) inMemoryLogs.length = 200;

  const sb = getSupabase();
  if (!sb || !logsTableAvailable) {
    console.log("AI Reasoning Log:", JSON.stringify(logEntry, null, 2));
    return;
  }

  try {
    const { error } = await sb.from("ai_reasoning_logs").insert(logEntry);
    if (!error) return;

    if (isMissingLogsTableError(error.message)) {
      logsTableAvailable = false;
      console.warn(
        "Supabase table 'ai_reasoning_logs' not found. Falling back to console logs."
      );
    } else {
      console.error("Supabase log error:", error.message);
    }

    console.log("AI Log (Supabase fallback):", JSON.stringify(logEntry, null, 2));
  } catch (err: any) {
    console.error("Supabase insert failed:", err.message);
    console.log("AI Log (Supabase fallback):", JSON.stringify(logEntry, null, 2));
  }
}

export async function fetchUserLogs(
  userPubkey: string,
  limit = 20
): Promise<any[]> {
  const sb = getSupabase();
  if (!sb || !logsTableAvailable) {
    return inMemoryLogs
      .filter((log) => log.user_pubkey === userPubkey)
      .slice(0, limit);
  }

  try {
    const { data, error } = await sb
      .from("ai_reasoning_logs")
      .select("*")
      .eq("user_pubkey", userPubkey)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingLogsTableError(error.message)) {
        logsTableAvailable = false;
        console.warn(
          "Supabase table 'ai_reasoning_logs' not found. Returning empty logs."
        );
      } else {
        console.error("Failed to fetch logs:", error.message);
      }
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}
