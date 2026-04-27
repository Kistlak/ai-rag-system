-- ================================================================
-- Phase 9 schema — Multi-Tenant SaaS
-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- ================================================================

-- 1. Profiles (one row per auth user, created by trigger below)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 2. Assistants (one per chatbot the user creates)
create table if not exists public.assistants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,                -- public URL: /a/<slug>
  name text not null,
  description text,
  system_prompt text,                       -- null = use default RAG prompt
  pinecone_namespace text unique not null,  -- equals id; stored explicitly for clarity
  llm_provider text not null default 'anthropic',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Sources (one row per URL ingested into an assistant)
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  url text not null,
  title text,
  status text not null default 'pending',  -- pending | processing | ready | failed
  error text,
  chunk_count int not null default 0,
  ingested_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assistant_id, url)
);

create index if not exists sources_assistant_idx on public.sources(assistant_id);

-- ================================================================
-- RLS
-- ================================================================

alter table public.profiles  enable row level security;
alter table public.assistants enable row level security;
alter table public.sources    enable row level security;

-- profiles: user can read and update their own row only
create policy "users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- assistants: owner has full CRUD; anyone can read public ones
create policy "owners full access to their assistants"
  on public.assistants for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "public read for public assistants"
  on public.assistants for select
  using (is_public = true);

-- sources: owner of the assistant has full CRUD; not exposed publicly
create policy "owners full access to their sources"
  on public.sources for all
  using (
    assistant_id in (
      select id from public.assistants where owner_id = auth.uid()
    )
  )
  with check (
    assistant_id in (
      select id from public.assistants where owner_id = auth.uid()
    )
  );

-- ================================================================
-- Trigger: auto-create profile row on sign-up
-- ================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================
-- Done — verify with:
--   select * from public.profiles;
--   select * from public.assistants;
--   select * from public.sources;
-- ================================================================
