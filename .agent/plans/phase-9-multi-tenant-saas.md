# Phase 9 — Multi-Tenant SaaS (MVP Pivot)

## Pivot note

Phases 1–8 built a single-purpose BBC News RAG. Phase 9 reuses the RAG core (embed, Pinecone, chat UI) and pivots the product to a **self-service platform**: a user signs up, pastes a URL, and gets a public chatbot URL they can share.

This supersedes Phases 7 (cron) and 8 (deploy as BBC) — those plans are parked, not deleted. The BBC pipeline becomes either a demo seed assistant or is removed; decision deferred (open question Q5 below).

## Goal

Ship the smallest possible "paste URL → public chatbot" product:
- Auth-gated dashboard
- One assistant per user (extend to many later)
- One URL per assistant (extend to crawling later)
- Public read-only chat at `/a/<slug>`

## Stack additions

| Concern | Choice | Why |
|---|---|---|
| Auth | **Supabase Auth** | Bundled with DB; magic-link + OAuth out of the box |
| Relational DB | **Supabase Postgres** | Same project as auth; RLS gives us multi-tenant isolation |
| File storage | Supabase Storage (later, for logos) | Same project |
| Vectors | **Pinecone (existing)** with namespaces | One namespace per assistant — hard isolation |
| LLM | **Existing `lib/llm.ts`** (Anthropic/OpenAI toggle) | No change |
| Embeddings | **Existing `lib/rag/embed.ts`** (OpenAI) | No change for MVP |

New env vars (added to `.env.local` and Vercel):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # safe to expose; replaces "anon key"
SUPABASE_SECRET_KEY=                     # server-only, never to client; replaces "service role key"
```

## Database schema

```sql
-- 1. profiles mirrors auth.users; created via trigger on signup
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

-- 2. one row per assistant
create table public.assistants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,                    -- public URL: /a/<slug>
  name text not null,
  description text,
  system_prompt text,                           -- optional override; null = default
  pinecone_namespace text unique not null,      -- isolation key (= id by default)
  llm_provider text default 'anthropic',
  is_public boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. one row per source URL ingested into an assistant
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  url text not null,
  title text,
  status text not null default 'pending',       -- pending | processing | ready | failed
  error text,
  chunk_count int default 0,
  ingested_at timestamptz,
  created_at timestamptz default now(),
  unique (assistant_id, url)
);

create index sources_assistant_idx on public.sources(assistant_id);
```

### RLS policies

```sql
alter table public.profiles enable row level security;
alter table public.assistants enable row level security;
alter table public.sources enable row level security;

-- profiles
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

-- assistants
create policy "owners full access to their assistants" on public.assistants
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "anyone reads public assistants" on public.assistants
  for select using (is_public = true);

-- sources
create policy "owners full access to their sources" on public.sources
  for all
  using (assistant_id in (select id from public.assistants where owner_id = auth.uid()))
  with check (assistant_id in (select id from public.assistants where owner_id = auth.uid()));
```

The public `/a/<slug>` chat route uses the **secret key** server-side (bypasses RLS) to read the assistant config and run retrieval, but only after verifying `is_public = true`. End-users never need accounts to chat.

## Sub-phases

Phase 9 is large enough to need its own checkpoints. Each sub-phase ends with a green checkpoint and a commit.

### 9.1 — Supabase project + schema (½ day)

**Deliverables:**
- Supabase project created (free tier).
- SQL above run via Supabase SQL editor.
- `lib/db/supabase.ts` — exports `createBrowserClient()` and `createServerClient()` using `@supabase/ssr`.
- Env vars wired.

**Checkpoint:** `select * from auth.users` empty; tables exist; can sign up via `supabase.auth.signUp` from a script.

### 9.2 — Auth flow (½ day)

**Deliverables:**
- `app/(auth)/sign-in/page.tsx` — email magic-link form.
- `app/(auth)/callback/route.ts` — handles Supabase auth callback.
- `middleware.ts` — protects `/dashboard/*` routes.
- Trigger on `auth.users` insert that creates a `profiles` row.

**Checkpoint:** Sign up via magic link → redirected to `/dashboard` → `select * from profiles` shows the user.

### 9.3 — Generic article extractor (½ day)

**Deliverables:**
- Replace BBC-only selector with `@mozilla/readability` + `jsdom` (or `@extractus/article-extractor`).
- `lib/ingest/article.ts:fetchArticle(url)` works on arbitrary URLs.
- Keep cheerio fallback only if readability fails.
- Test on 5 different sites (BBC, Reuters/Guardian, a personal blog, a docs site, a Wikipedia article).

**Checkpoint:** All 5 test URLs return ≥200 chars of clean text.

### 9.4 — Single-URL ingest, namespace-aware (½ day)

**Deliverables:**
- `lib/rag/pinecone.ts` — accept `namespace` param on `upsertChunks()` and `queryByVector()`.
- `lib/ingest/pipeline.ts` — `runSingleUrlIngest({ assistantId, url })` → fetch → chunk → embed → upsert into `assistants.pinecone_namespace`. Update `sources.status` along the way.
- `app/api/sources/route.ts` — `POST` adds a URL (auth-gated, runs ingest synchronously for MVP).

**Checkpoint:** From the dashboard (next sub-phase), submitting a URL results in `sources.status = 'ready'` and Pinecone shows vectors in that namespace.

### 9.5 — Dashboard UI (1 day)

**Deliverables:**
- `app/dashboard/page.tsx` — list user's assistants. "Create assistant" button.
- `app/dashboard/[assistantId]/page.tsx` — assistant detail: name, slug, share link, sources list with status badges, "add URL" form.
- Reuse existing UI components (Card, Button, Input, ScrollArea).

**Checkpoint:** User can create an assistant, add a URL, see status flip from `pending` → `ready`, and copy the share link.

### 9.6 — Public chat route `/a/[slug]` (½ day)

**Deliverables:**
- `app/a/[slug]/page.tsx` — server component fetches assistant by slug + `is_public`. 404 if missing.
- Reuse existing `<Chat />` component, parameterized with `assistantId` (passed via prop or transport URL).
- `app/api/chat/route.ts` — accept `assistantId` in body, look up namespace + system prompt, query that namespace.

**Checkpoint:** Visit `/a/<slug>` in incognito → can chat → answers cite sources from that assistant's URLs only.

### 9.7 — Per-tenant rate limiting (½ day)

**Deliverables:**
- In-memory limiter keyed on `assistantId + IP` for `/api/chat` (e.g. 20 req / 60s).
- Document the in-memory limitation in README; upgrade path to Upstash noted.
- 429 response with `Retry-After` header.

**Checkpoint:** Hammer the public chat endpoint → 429 after 20 requests in a minute.

## Deferred to Phase 10+

Explicitly **not** in this MVP:
- Site crawling / sitemap discovery (only single-page ingest)
- Background job queue (sync ingest is fine for one URL ≤ 60s)
- Embed widget / iframe distribution
- Custom system prompts UI (DB column exists; no editor yet)
- Custom domains
- Billing / usage caps
- Re-ingest scheduling per assistant
- Chat history persistence (the dormant sidebar code stays dormant)
- Per-assistant LLM model selection in UI (column exists; defaults from env)
- Analytics / dashboard metrics

## Pre-flight checks before any 9.x code

- [ ] User confirms Supabase account created.
- [ ] User answers Q1–Q5 below.
- [ ] Phase 6 commit (`193ca10`) is the base; Phases 7–8 stay un-implemented.
- [ ] Existing BBC vectors in Pinecone default namespace: leave alone for now. Q5 decides their fate.

## Open questions for the user

1. **Slug strategy** — auto-generated short ID (e.g. `a3f9k`), or user picks? Default: auto-generated, editable later.
2. **Anonymous chat** — anyone with `/a/<slug>` chats without signing in (Chatbase model)? Default: yes.
3. **Magic-link only, or add Google OAuth too?** Default: magic-link only for MVP.
4. **Public assistant cap per user** — limit free users to N assistants and M URLs? Default: 3 assistants × 5 URLs each, hard-coded for MVP.
5. **Existing BBC code & vectors** — three options:
   - (a) Delete BBC-specific code (`lib/ingest/rss.ts`, BBC selector) entirely.
   - (b) Keep `rss.ts` for later "RSS as a source type" but stop using it now.
   - (c) Re-ingest BBC under a sample assistant called "BBC News" owned by a system account, so new users see a working demo.
   Default: **(b)** — minimal change, keeps the option open.

## Risks / pitfalls

- **Secret key leakage** — `SUPABASE_SECRET_KEY` must never reach the client. Only used in server actions / route handlers. Naming convention (no `NEXT_PUBLIC_` prefix) keeps Next from inlining it.
- **Pinecone serverless cost** — namespaces are free, but query volume scales with public traffic. Rate limiting (9.7) is non-optional.
- **Crawling abuse** — even single-URL ingest can be pointed at illegal/copyrighted content. Add a basic robots.txt check + a "I confirm I have rights" checkbox on the add-URL form. (Defer the legal page itself to Phase 10.)
- **Sync ingest timeout** — Vercel Hobby = 60s. Single-page ingest (fetch + extract + ~5 embed calls + upsert) is well under this. If a page is huge, truncate at ~50 chunks for safety.
- **Slug squatting** — use a profanity filter or just generate random slugs to avoid users grabbing brand names.

## Commit per sub-phase

```
Phase 9.1: Supabase project + schema
Phase 9.2: auth flow with magic-link + middleware
Phase 9.3: generic article extractor (readability)
Phase 9.4: namespace-aware ingest pipeline
Phase 9.5: dashboard UI for assistants + sources
Phase 9.6: public /a/<slug> chat route
Phase 9.7: per-tenant rate limiting
```

End of Phase 9 = MVP demo-able to a third party.
