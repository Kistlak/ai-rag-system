-- ================================================================
-- Token usage tracking on assistant messages
-- Run in: Supabase dashboard → SQL Editor → New query → Run
-- ================================================================

alter table public.chat_messages
  add column if not exists usage jsonb;

-- Optional helper index for aggregation queries (cheap on small data)
create index if not exists chat_messages_usage_idx
  on public.chat_messages((usage->>'totalTokens'))
  where usage is not null;
