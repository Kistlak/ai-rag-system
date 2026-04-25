# Session State — BBC News RAG System

> Always-current snapshot of "where we are right now."
> Read this first when the user types `continue`. Update it before stopping or running out of context.
> See `/CLAUDE.md` Rule 3 for the full protocol.

---

- **Last updated:** 2026-04-25
- **Current phase:** Phase 5 COMPLETE — Phase 6 (Chat UI) is next
- **Current sub-step:** N/A — Phase 5 fully done and committed
- **Completed this session:**
  - Phase 5: `lib/llm.ts` (Anthropic model wrapper, `claude-sonnet-4-5`), `app/api/chat/route.ts` (POST handler). Fully verified: streaming with [Source N] citations, source-url parts, graceful fallback. Committed as `403b7ad`.
- **In-progress:** Nothing.
- **Next concrete step:** Start **Phase 6 — Chat UI**. Read `.agent/plans/phase-6-chat-ui.md` first.
- **Blockers / open questions:**
  - **Important v6 API deviation for Phase 6:** The AI SDK v6 uses UIMessage protocol. The `useChat` hook is now from `ai/react` (same package, same import). Messages have a `parts` array — sources arrive as `source-url` parts (type `SourceUrlUIPart`), NOT as a `data` array like in v4. Phase 6 must read sources from `message.parts.filter(p => p.type === 'source-url')`, not from `data`.
  - `react-markdown` + `remark-gfm` need to be installed (not yet in package.json).
  - Tailwind v4 in use — no `tailwind.config.ts` file, styles via `app/globals.css` + postcss. shadcn components already added.
- **Pre-resume commands:** `npm run dev` to verify server still starts clean.
- **Last commit:** `403b7ad` — Phase 5: streaming chat API with RAG context + source annotations

---

## How to read this file

Each time you (Claude) start a session, treat the fields above as the source of truth for *intent and progress*, but **always cross-check against the actual repo state** (`git status`, `git log -5`, file inspection). If they disagree, the repo wins, and you update this file to match.
