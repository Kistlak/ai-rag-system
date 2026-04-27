-- ================================================================
-- Optional sign-in for public chat — chat persistence
-- Run in: Supabase dashboard → SQL Editor → New query → Run
-- ================================================================

-- 1. Chats — one conversation thread per (user, assistant)
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_assistant_updated_idx
  on public.chats(user_id, assistant_id, updated_at desc);

-- 2. Chat messages — UIMessage parts persisted as JSONB
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  parts jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_chat_idx
  on public.chat_messages(chat_id, created_at);

-- ================================================================
-- RLS
-- ================================================================

alter table public.chats         enable row level security;
alter table public.chat_messages enable row level security;

-- chats: a signed-in user has full CRUD on their own chats only
create policy "users full access to own chats"
  on public.chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chat_messages: scoped through chats (only the owner of the parent chat)
create policy "users access messages of own chats"
  on public.chat_messages for all
  using (chat_id in (select id from public.chats where user_id = auth.uid()))
  with check (chat_id in (select id from public.chats where user_id = auth.uid()));

-- ================================================================
-- Done — verify with:
--   select * from public.chats;
--   select * from public.chat_messages;
-- ================================================================
