# CLAUDE.md — Working Rules for This Project

This file is loaded automatically by Claude Code at the start of every session in this repository.
Read it carefully and follow these rules **without being reminded**.

---

## Project Overview

This is a **BBC News RAG System** — a Retrieval-Augmented Generation chatbot that answers user questions using BBC News articles as its knowledge base.

- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Vercel AI SDK
- **LLM:** Anthropic Claude (Sonnet)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Vector DB:** Pinecone (serverless)
- **Ingestion:** BBC public RSS feeds via `rss-parser` + `cheerio`
- **Deploy:** Vercel (with hourly Cron for re-ingestion)

The full source-of-truth build plan lives in `BBC_RAG_NextJS_Build_Plan.pdf` at the repo root.
The phased implementation plans live in `.agent/plans/`.

---

## Rule 1 — Always plan before implementing

**Before writing any code for a new phase or feature, you MUST:**

1. Read the relevant plan file in `.agent/plans/` (e.g. `phase-3-ingestion.md`).
2. If no plan exists for what the user is asking, **stop and write one first** in `.agent/plans/` before touching code.
3. Confirm the approach with the user if anything in the plan is ambiguous or appears to conflict with the PDF.
4. Only then begin implementation.

The plans in `.agent/plans/` are the contract. They are derived from `BBC_RAG_NextJS_Build_Plan.pdf` and should be updated (not bypassed) if the approach changes.

---

## Rule 2 — Build phase by phase, with checkpoints

The PDF defines 8 phases. Each one ends with a verifiable checkpoint.

- Complete each phase **fully** — including its checkpoint — before starting the next.
- After each phase, run `npm run dev` (or the relevant verification step) and confirm the checkpoint passes.
- Commit to git at the end of every phase with a clear message like `Phase 3: ingestion pipeline working end-to-end`.
- If a step is ambiguous, prefer the simplest implementation that satisfies the acceptance criteria.

Do **not** start Phase N+1 until Phase N's checkpoint is green.

---

## Rule 3 — Session continuity (the SESSION_STATE.md protocol)

The file `.agent/SESSION_STATE.md` is the **single source of truth for "where we are right now."** It must always be kept current. The protocol has three triggers:

### 3a. When you (Claude) are about to run out of session / tokens / context

If you sense you are approaching a context limit, an auto-compact, or the end of your usable session **before the current task is finished:**

1. **Stop starting new work.** Finish only what you can safely commit.
2. Update `.agent/SESSION_STATE.md` with:
   - Current phase and sub-step
   - What was completed in this session (file-by-file)
   - What is in-progress (and exactly where you left off — file path + line number + what was being changed)
   - What is the next concrete step to resume
   - Any blockers, open questions, or decisions deferred to the user
   - Any commands the user should run before resuming (e.g. `npm install`)
3. Tell the user briefly: "I've updated `.agent/SESSION_STATE.md` because I'm running low on context. Type **`continue`** in a fresh session to resume."

### 3b. When the user types `continue` (or `resume`, `pick up where we left off`, etc.)

1. Read `.agent/SESSION_STATE.md` **first, before any other action.**
2. Read the relevant phase file in `.agent/plans/`.
3. Verify current repo state with `git status` and `git log -5` to confirm what was actually committed vs. claimed-as-done.
4. Resume from the "next concrete step" recorded in `SESSION_STATE.md`.
5. If the recorded state conflicts with what you observe in the repo, trust the repo and update the state file.

### 3c. When the user signals they are stopping work

Triggers include: "I'm done for today", "stopping here", "let's pause", "pick this up tomorrow", "/quit"-style intent, or any clear end-of-session signal.

1. Update `.agent/SESSION_STATE.md` with the same fields as 3a.
2. Suggest a clean commit if there are uncommitted changes.
3. Confirm to the user that the state file is up to date.

### What `SESSION_STATE.md` must always contain

```
- Last updated: <ISO timestamp>
- Current phase: <e.g. "Phase 3 — Ingestion Pipeline">
- Current sub-step: <e.g. "lib/ingest/article.ts — cheerio extraction">
- Completed this session: <bulleted list>
- In-progress: <exact file + line + what's half-done>
- Next concrete step: <one sentence, actionable>
- Blockers / open questions: <if any>
- Pre-resume commands: <if any, e.g. npm install>
- Last commit: <SHA + message>
```

---

## Rule 4 — Stay close to the PDF

`BBC_RAG_NextJS_Build_Plan.pdf` is the spec. Do not invent features, swap libraries, or restructure folders without the user's approval. The reference snippets in section 4 of the PDF are starting templates, not final code — improve them where needed but keep the contracts.

If a phase requires a deviation (e.g. a library is deprecated), **document the deviation in the phase plan** with rationale, before coding it.

---

## Rule 5 — Code style

- TypeScript strict mode. No `any` in business logic.
- ESLint must pass.
- Default to writing **no** comments. Only add a comment when the *why* is non-obvious.
- Don't add backwards-compat shims, mock fallbacks, or "future-proofing" abstractions the PDF doesn't ask for.
- All secrets via env vars. Never commit `.env.local`.

---

## Rule 6 — Git hygiene

- Commit at the end of each phase with the message format: `Phase N: <one-line summary>`.
- Don't commit secrets. `.env.local`, API keys, and any token must be gitignored.
- Don't push to remote unless the user explicitly asks.
- Don't run destructive git commands (`reset --hard`, `push --force`, `clean -f`) without explicit user approval.

---

## Quick file map

```
.agent/
├── plans/
│   ├── README.md              ← index of phases
│   ├── phase-1-bootstrap.md
│   ├── phase-2-pinecone.md
│   ├── phase-3-ingestion.md
│   ├── phase-4-retrieval.md
│   ├── phase-5-chat-api.md
│   ├── phase-6-chat-ui.md
│   ├── phase-7-cron.md
│   └── phase-8-polish-deploy.md
└── SESSION_STATE.md           ← always-current "where we are"
BBC_RAG_NextJS_Build_Plan.pdf  ← source-of-truth spec
CLAUDE.md                      ← this file
```
