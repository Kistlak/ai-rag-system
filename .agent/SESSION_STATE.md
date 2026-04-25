# Session State — BBC News RAG System

> Always-current snapshot of "where we are right now."
> Read this first when the user types `continue`. Update it before stopping or running out of context.
> See `/CLAUDE.md` Rule 3 for the full protocol.

---

- **Last updated:** 2026-04-25
- **Current phase:** Phase 2 COMPLETE — Phase 3 (Ingestion Pipeline) is next
- **Current sub-step:** N/A — Phase 2 fully done and committed
- **Completed this session:**
  - Phase 1: Next.js 16 scaffold, all RAG deps, shadcn/ui (button/input/card/scroll-area), `.env.example`.
  - Phase 2: `lib/rag/types.ts` (ChunkMetadata with index sig, RetrievedChunk), `lib/rag/pinecone.ts` (singleton client, upsertChunks, queryByVector), `scripts/pinecone-smoke.ts`. Smoke test passed. Adapted for Pinecone SDK v7 (upsert takes `{records:[]}`, deleteOne takes `{id}`).
- **In-progress:** Nothing.
- **Next concrete step:** Start **Phase 3 — Ingestion Pipeline**. Read `.agent/plans/phase-3-ingestion.md` first.
- **Blockers / open questions:**
  - `OPENAI_API_KEY` is empty in `.env.local` — **must be filled in before Phase 3 can run** (embeddings call OpenAI).
  - Pinecone index is named `rag-news` (not `bbc-news`). Code reads from env so it works fine.
  - SDK deviations from PDF: Next.js 16 (not 14), Tailwind v4, Pinecone SDK v7, Vercel AI SDK v6, Zod v4. All working but PDF snippets need adaptation.
- **Pre-resume commands:** None needed.
- **Last commit:** `202df29` — Phase 2: Pinecone client wrapper + smoke test passing

---

## How to read this file

Each time you (Claude) start a session, treat the fields above as the source of truth for *intent and progress*, but **always cross-check against the actual repo state** (`git status`, `git log -5`, file inspection). If they disagree, the repo wins, and you update this file to match.
