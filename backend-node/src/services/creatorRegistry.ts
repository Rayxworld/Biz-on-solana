import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/index.js";

type CreatorType = "human" | "agent";

interface CreatorRecord {
  user_pubkey: string;
  creator_type: CreatorType;
  creator_label?: string | null;
  agent_id?: string | null;
  updated_at: string;
}

const inMemoryRegistry: Map<string, CreatorRecord> = new Map();
let supabase: SupabaseClient | null = null;
let registryTableAvailable = true;

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  if (!config.supabaseUrl || !config.supabaseServiceKey) return null;
  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  return supabase;
}

function isMissingTable(message: string): boolean {
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

export async function registerCreatorMetadata(params: {
  userPubkey: string;
  creatorType: CreatorType;
  creatorLabel?: string;
  agentId?: string;
}): Promise<void> {
  const record: CreatorRecord = {
    user_pubkey: params.userPubkey,
    creator_type: params.creatorType,
    creator_label: params.creatorLabel || null,
    agent_id: params.agentId || null,
    updated_at: new Date().toISOString(),
  };
  inMemoryRegistry.set(params.userPubkey, record);

  const sb = getSupabase();
  if (!sb || !registryTableAvailable) return;
  const { error } = await sb.from("creator_registry").upsert(record, {
    onConflict: "user_pubkey",
  });
  if (error && isMissingTable(error.message)) {
    registryTableAvailable = false;
  }
}

export async function getCreatorMetadata(userPubkey: string): Promise<CreatorRecord | null> {
  const mem = inMemoryRegistry.get(userPubkey);
  if (mem) return mem;

  const sb = getSupabase();
  if (!sb || !registryTableAvailable) return null;
  const { data, error } = await sb
    .from("creator_registry")
    .select("*")
    .eq("user_pubkey", userPubkey)
    .single();
  if (error) {
    if (isMissingTable(error.message)) registryTableAvailable = false;
    return null;
  }
  return (data as CreatorRecord) || null;
}
