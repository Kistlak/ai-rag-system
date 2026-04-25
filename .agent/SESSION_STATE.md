# Session State — BBC News RAG System

> Always-current snapshot of "where we are right now."
> Read this first when the user types `continue`. Update it before stopping or running out of context.
> See `/CLAUDE.md` Rule 3 for the full protocol.

---

- **Last updated:** 2026-04-25
- **Current phase:** Phase 3 — CHECKPOINT BLOCKED (code complete, billing issue)
- **Current sub-step:** Waiting for user to add OpenAI billing credit, then re-run `npm run ingest:local`
- **Completed this session:**
  - Phase 1 & 2: done (see git log).
  - Phase 3 code: `lib/ingest/rss.ts`, `lib/ingest/article.ts`, `lib/rag/chunk.ts`, `lib/rag/embed.ts`, `lib/ingest/pipeline.ts`, `scripts/ingest-local.ts`. All tsc-clean. Committed as `1f347d1`.
  - Confirmed working: RSS fetch, Pinecone dedup query, BBC article HTML extraction, chunking.
  - Blocked at: `embed()` call — OpenAI returns `insufficient_quota` (no billing credit on account).
- **In-progress:** Nothing. Waiting on user action.
- **Next concrete step:**
  1. User adds credit at platform.openai.com/billing.
  2. Run `npm run ingest:local` — should index 50–150+ articles.
  3. Confirm Pinecone dashboard shows vectors growing.
  4. Re-run script a second time to verify dedup returns 0 new articles.
  5. Commit checkpoint confirmation, then move to **Phase 4 — Retrieval Layer**.
- **Blockers / open questions:**
  - OpenAI `insufficient_quota` — user must add billing credit before ingest can run.
  - Pinecone index name is `rag-news` (not `bbc-news`). Fine — code reads from env.
  - SDK deviations: Next.js 16, Tailwind v4, Pinecone SDK v7, Vercel AI SDK v6, Zod v4. All working but PDF snippets need adaptation.
- **Pre-resume commands:** `npm run ingest:local` (after billing is added)
- **Last commit:** `1f347d1` — Phase 3: ingestion pipeline (RSS → chunk → embed → Pinecone)

---

## How to read this file

Each time you (Claude) start a session, treat the fields above as the source of truth for *intent and progress*, but **always cross-check against the actual repo state** (`git status`, `git log -5`, file inspection). If they disagree, the repo wins, and you update this file to match.
