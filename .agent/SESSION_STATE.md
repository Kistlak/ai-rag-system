# Session State — Multi-Tenant SaaS RAG Platform

> Always-current snapshot of "where we are right now."
> Read this first when the user types `continue`. Update it before stopping or running out of context.
> See `/CLAUDE.md` Rule 3 for the full protocol.

---

- **Last updated:** 2026-04-27
- **Current phase:** Phase 9 COMPLETE (9.1–9.7 all done, not committed per user instruction)
- **Current sub-step:** N/A
- **Completed this session:**
  - LLM provider toggle (`lib/llm.ts`)
  - App review + product pivot (BBC-only → multi-tenant SaaS)
  - Phase 9 plan written
  - **9.1** Supabase schema (`supabase/schema.sql`), `lib/db/client.ts`, `lib/db/server.ts`
  - **9.2** Auth flow: `app/(auth)/sign-in/page.tsx`, `app/auth/callback/route.ts`, `proxy.ts`
  - **9.3** Generic article extractor (Readability primary, BBC cheerio fallback), `scripts/test-extractor.ts`
  - **9.4** Namespace-aware Pinecone (`lib/rag/pinecone.ts`), `lib/ingest/pipeline-url.ts`, `app/api/sources/route.ts`
  - **9.5** Dashboard UI: layout, sign-out, `AssistantGrid`, assistant detail with `AssistantManager`; `app/api/assistants/route.ts`, `app/api/assistants/[id]/route.ts`, `app/api/sources/[id]/route.ts`, `lib/slug.ts`
  - **9.6** Public chat route `app/a/[slug]/page.tsx`; Chat component accepts `assistantId` prop
  - **9.7** In-memory rate limiter in `app/api/chat/route.ts` (20 req/60s per assistantId+IP); updated route to resolve namespace + system prompt from DB
  - Build: **clean** — all 12 routes compile, TypeScript passes
- **In-progress:** Nothing.
- **Next concrete step:** User tests the full flow locally (`npm run dev`):
  1. Visit `/sign-in` → magic link → `/dashboard`
  2. Create an assistant
  3. Add a URL (ingest)
  4. Visit the public `/a/<slug>` chat and ask a question
  5. Verify answer is grounded in the ingested URL
- **Blockers / open questions:**
  - Supabase Auth redirect URL must include `http://localhost:3000/auth/callback` — confirm in dashboard
  - `NEXT_PUBLIC_APP_URL` not set in `.env.local` (defaults to `http://localhost:3000` in assistant detail page)
  - Phases 7–8 (BBC cron + deploy) still PARKED
  - Rename feature on assistant detail page is disabled (deferred to Phase 10)
  - Pinecone cleanup on assistant delete is deferred (orphaned vectors stay — Phase 10)
- **Pre-resume commands:** `npm run dev`
- **Locked decisions:** See phase-9 plan for Q1–Q5
- **Last commit:** `30343a9` — updated UI (no commits made this session per user instruction)

---

## How to read this file

Each time you (Claude) start a session, treat the fields above as the source of truth for *intent and progress*, but **always cross-check against the actual repo state** (`git status`, `git log -5`, file inspection). If they disagree, the repo wins, and you update this file to match.
