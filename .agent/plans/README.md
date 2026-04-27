# Implementation Plans — BBC News RAG System

This directory contains the phase-by-phase implementation plans derived from `BBC_RAG_NextJS_Build_Plan.pdf`.

**Rule:** Claude must read the relevant phase plan before writing any code for that phase. See `/CLAUDE.md` at the repo root for the full working rules.

## Phase Index

| # | Phase | File | Checkpoint |
|---|-------|------|------------|
| 1 | Project Bootstrap | [phase-1-bootstrap.md](./phase-1-bootstrap.md) | `npm run dev` serves Next.js on `localhost:3000` |
| 2 | Pinecone Setup | [phase-2-pinecone.md](./phase-2-pinecone.md) | Smoke-test upserts + queries one dummy vector |
| 3 | Ingestion Pipeline | [phase-3-ingestion.md](./phase-3-ingestion.md) | Local script populates Pinecone with hundreds of vectors |
| 4 | Retrieval Layer | [phase-4-retrieval.md](./phase-4-retrieval.md) | `retrieve()` returns top-k chunks with metadata |
| 5 | Chat API Route | [phase-5-chat-api.md](./phase-5-chat-api.md) | `POST /api/chat` streams an answer with sources |
| 6 | Chat UI | [phase-6-chat-ui.md](./phase-6-chat-ui.md) | UI streams tokens + renders citations |
| 7 | Cron Ingestion | [phase-7-cron.md](./phase-7-cron.md) | `/api/ingest` runs hourly on Vercel, secured by bearer token |
| 8 | Polish & Deploy | [phase-8-polish-deploy.md](./phase-8-polish-deploy.md) | Live on Vercel, all acceptance criteria met |
| 9 | Multi-Tenant SaaS (pivot) | [phase-9-multi-tenant-saas.md](./phase-9-multi-tenant-saas.md) | Self-service: paste URL → public chatbot at `/a/<slug>` |

> **Note:** Phase 9 is a product pivot. Phases 7–8 (BBC cron + BBC deploy) are **parked**. The RAG core from Phases 1–6 is reused; everything else is new.

## How to use these plans

1. Open the file for the phase you're starting.
2. Read **Goal**, **Deliverables**, **Steps**, and **Checkpoint**.
3. Implement in the order listed. Don't skip steps.
4. When the checkpoint passes, commit and move to the next phase.
5. If the plan needs to change mid-phase, update the file *before* coding the deviation.

## Acceptance criteria (whole project)

From PDF section 5:
- Pinecone holds **≥ 1,000 vectors** from **≥ 100 unique BBC articles**.
- Cron job runs hourly without errors; new articles indexed within an hour.
- Top-5 retrieved chunks for a recent-story question are all relevant.
- Chat streams token-by-token; cites sources by URL; gracefully says "no relevant coverage" when off-topic.
- Page cold-start under 1.5s; responsive on mobile + desktop.
- All secrets in env vars; ingest endpoint rejects missing/wrong bearer token.
- TypeScript strict passes; ESLint passes; no `any` in business logic.
