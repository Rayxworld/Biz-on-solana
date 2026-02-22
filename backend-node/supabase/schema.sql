-- BizFi AI logs table + RLS policy
-- Run this in Supabase SQL Editor.

create table if not exists public.ai_reasoning_logs (
  id bigint generated always as identity primary key,
  market_id bigint not null,
  user_pubkey text not null,
  analysis_json jsonb not null,
  guardrail_result jsonb not null,
  action_taken text not null,
  market_data_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_reasoning_logs_user_pubkey_idx
  on public.ai_reasoning_logs(user_pubkey);

create index if not exists ai_reasoning_logs_created_at_idx
  on public.ai_reasoning_logs(created_at desc);

alter table public.ai_reasoning_logs enable row level security;

-- Allow authenticated users to read logs.
drop policy if exists "read_own_ai_logs" on public.ai_reasoning_logs;
create policy "read_own_ai_logs"
  on public.ai_reasoning_logs
  for select
  using (auth.role() = 'authenticated');

-- Server-side inserts use service role key and bypass RLS.

create table if not exists public.creator_registry (
  user_pubkey text primary key,
  creator_type text not null check (creator_type in ('human', 'agent')),
  creator_label text,
  agent_id text,
  updated_at timestamptz not null default now()
);

create index if not exists creator_registry_creator_type_idx
  on public.creator_registry(creator_type);

alter table public.creator_registry enable row level security;

drop policy if exists "read_creator_registry" on public.creator_registry;
create policy "read_creator_registry"
  on public.creator_registry
  for select
  using (auth.role() = 'authenticated');
