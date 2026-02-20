import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/index.js";
import type { AnalysisResult } from "../ai/agent.js";

// ── Supabase client (lazy init — null if not configured) ──
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn(
      "⚠ Supabase not configured — AI logs will only go to console (demo mode)"
    );
    return null;
  }
  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  return supabase;
}

/**
 * Log an AI analysis result to Supabase.
 *
 * Table: ai_reasoning_logs
 * Columns: market_id, user_pubkey, analysis_json, guardrail_result,
 *          action_taken, created_at
 *
 * Falls back to console.log if Supabase is not configured (demo mode).
 */
export async function logAnalysis(
  marketId: number,
  userPubkey: string,
  result: AnalysisResult
): Promise<void> {
  const logEntry = {
    market_id: marketId,
    user_pubkey: userPubkey,
    analysis_json: result.analysis,
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

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from("ai_reasoning_logs")
        .insert(logEntry);
      if (error) {
        console.error("Supabase log error:", error.message);
        // Fallback to console
        console.log("📝 AI Log (Supabase fallback):", JSON.stringify(logEntry, null, 2));
      }
    } catch (err: any) {
      console.error("Supabase insert failed:", err.message);
      console.log("📝 AI Log (Supabase fallback):", JSON.stringify(logEntry, null, 2));
    }
  } else {
    // Demo mode: console logging
    console.log("📝 AI Reasoning Log:", JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Fetch AI reasoning logs for a user from Supabase.
 * Returns empty array if Supabase is not configured.
 */
export async function fetchUserLogs(
  userPubkey: string,
  limit = 20
): Promise<any[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from("ai_reasoning_logs")
      .select("*")
      .eq("user_pubkey", userPubkey)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch logs:", error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}
