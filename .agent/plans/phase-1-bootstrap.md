# Phase 1 — Project Bootstrap

## Goal
Stand up an empty Next.js 14 project with TypeScript, Tailwind, shadcn/ui, and all RAG-related dependencies installed. End with a dev server serving the default page.

## Deliverables
- A Next.js 14 app at the repo root (App Router, TypeScript, Tailwind, ESLint enabled).
- All core, UI, and dev dependencies installed.
- shadcn/ui initialized with `button`, `input`, `card`, `scroll-area` primitives added.
- `.env.example` with placeholders + `.env.local` filled in by the user.
- `.gitignore` covers `.env.local`.

## Pre-flight checks
- Node ≥ 18.18 installed (`node -v`).
- `npm` available.
- The user has API keys for Anthropic, OpenAI, and Pinecone ready (or plans to add them before Phase 2).

## Steps

### 1. Scaffold the Next.js app
The PDF assumes the project root *is* the Next.js app (folder named `bbc-rag/` in the PDF, but our repo root `ai-rag-system/` plays that role). Bootstrap directly into the current directory:

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
```

If the directory is non-empty, pass `--use-npm` and accept the prompt to scaffold into a non-empty dir, or ask the user how to proceed (the only existing files should be `BBC_RAG_NextJS_Build_Plan.pdf`, `CLAUDE.md`, `.agent/`, and `.git`).

### 2. Install core deps
```bash
npm i ai @ai-sdk/anthropic @ai-sdk/openai @pinecone-database/pinecone rss-parser cheerio zod openai
```
> Note: `openai` is needed because the embed wrapper in the PDF uses the OpenAI SDK directly (not `@ai-sdk/openai`'s embedding helper). If we decide to switch to `@ai-sdk/openai` for embeddings later, document that deviation in `phase-3-ingestion.md`.

### 3. Install UI deps
```bash
npx shadcn@latest init
npx shadcn@latest add button input card scroll-area
```
Pick defaults during init (CSS variables, slate base color, RSC = yes).

### 4. Install dev deps
```bash
npm i -D tsx dotenv
```

### 5. Create `.env.example`
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=bbc-news
CRON_SECRET=any-long-random-string
```
Then ask the user to copy it: `cp .env.example .env.local` and fill in real values.

### 6. Verify `.gitignore`
Confirm `.env*.local` is ignored (Next.js scaffold includes this by default). Add it explicitly if missing.

## Checkpoint
- `npm run dev` serves the default Next.js welcome page on `http://localhost:3000` with no console errors.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## Commit
```
Phase 1: Next.js + TypeScript + Tailwind + shadcn/ui scaffold with RAG deps installed
```

## Notes / pitfalls
- shadcn `init` may prompt for `globals.css` location — accept the default (`app/globals.css`).
- If `npx create-next-app` refuses because the directory has the PDF in it, move the PDF temporarily, then put it back after scaffold.
- Do **not** install `langchain` yet — the PDF marks it optional and we'll hand-roll the RAG glue.
