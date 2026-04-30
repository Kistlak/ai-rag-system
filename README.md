# AskBase

> Build AI assistants grounded in your own content.

AskBase is a self-service, multi-tenant SaaS platform for spinning up your own AI chatbot in minutes. Sign in with your email, paste in a few URLs (a docs site, a blog, a help-center page, a Wikipedia article - whatever you want the bot to know), and AskBase gives you a public chat link you can share with anyone.

The chatbot only answers from the content you fed it, citing every source by URL. No hallucinations about topics it wasn't trained on, no dependency on a generic web search - just an assistant that knows your stuff and proves it with citations.

---

## What you can do with it

- **Spin up a custom chatbot** from any set of public URLs in a couple of clicks.
- **Share a public chat link** (`/a/<slug>`) - visitors can chat without signing up.
- **See exactly where every answer came from** - each response cites the URL it was grounded in.
- **Manage multiple assistants** from one dashboard, each with its own knowledge base and system prompt.
- **Track usage per assistant** - sources, chunks, chats, messages, and token spend.
- **Optional sign-in for chat history** - visitors who want to keep their conversations can sign in and resume later.

It started as a single-purpose BBC News chatbot and was rebuilt into a generic platform. The article-extraction pipeline still has a BBC fallback, but it works on virtually any article-style URL.

---

## How it works (RAG in 30 seconds)

1. **Ingest.** When you add a URL, AskBase fetches the page, pulls the readable article body out (Mozilla Readability + a Cheerio fallback), and chunks it into ~600-token passages.
2. **Embed.** Each chunk is turned into a vector with OpenAI's `text-embedding-3-small`.
3. **Store.** Vectors are upserted into a Pinecone index, into a **namespace unique to that assistant** - so tenants can never see each other's data.
4. **Retrieve.** When a visitor asks a question, the question is embedded and the top-5 most similar chunks from that assistant's namespace are pulled.
5. **Generate.** Those chunks are injected into a Claude (or OpenAI) prompt, and the answer is streamed back token-by-token with inline `[Source N]` citations.

If nothing relevant is found, the bot says so honestly instead of making something up.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, lucide-react, next-themes (dark default) |
| Streaming chat | Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/react`) |
| LLM | Claude Sonnet 4.6 (default) - toggle to OpenAI GPT-4o via env var |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Vector store | Pinecone serverless, one namespace per assistant |
| Auth + DB | Supabase (magic-link auth, Postgres with RLS) |
| Article extraction | `@mozilla/readability` + `jsdom`, with `cheerio` BBC-style fallback |
| JS-rendered pages | Cloudflare Browser Rendering API (`/markdown`) - optional |
| Rate limiting | Upstash Redis sliding window - falls back to in-memory if not configured |
| Markdown rendering | `react-markdown` + `remark-gfm` |

---

## Project structure

```
ai-rag-system/
├── app/
│   ├── (auth)/sign-in/         Email magic-link page
│   ├── auth/callback/          Supabase OAuth code exchange
│   ├── a/[slug]/               Public chat at /a/<slug>
│   ├── dashboard/              Owner-only console
│   │   ├── page.tsx            Assistants grid (create / delete)
│   │   ├── [assistantId]/      Per-assistant manager (sources, settings, share link)
│   │   ├── usage/              Per-assistant usage stats
│   │   └── settings/           Account settings
│   └── api/
│       ├── assistants/         CRUD assistants
│       ├── sources/            Add / delete / retry source URLs
│       ├── chats/              Chat history (sign-in required)
│       └── chat/               Streaming chat endpoint (RAG + LLM)
├── components/
│   ├── chat.tsx                The streaming chat UI (sidebar, exchanges, export)
│   ├── message.tsx             Message renderer with citations
│   ├── theme-toggle.tsx        Dark/light toggle
│   └── ui/                     shadcn primitives (button, card, input, scroll-area)
├── lib/
│   ├── llm.ts                  Provider toggle (Anthropic / OpenAI)
│   ├── slug.ts                 Public-URL slug generator
│   ├── rate-limit.ts           Upstash + in-memory rate limiter
│   ├── db/                     Supabase clients (browser, server, admin)
│   ├── ingest/
│   │   ├── article.ts          Fetch → Readability → Cloudflare fallback
│   │   ├── pipeline-url.ts     Single-URL ingest into a namespace
│   │   ├── pipeline.ts         (legacy) BBC RSS bulk ingest
│   │   └── rss.ts              (legacy) BBC RSS feeds
│   └── rag/
│       ├── chunk.ts            Paragraph-aware chunker (~600 tokens, 80 overlap)
│       ├── embed.ts            OpenAI embeddings (batched)
│       ├── pinecone.ts         Namespace-aware upsert / query / delete
│       ├── retrieve.ts         Top-k retrieval + system-prompt builder
│       └── types.ts
├── supabase/
│   ├── schema.sql              Profiles, assistants, sources + RLS + signup trigger
│   ├── 2026-04-28-chats.sql    Chat history tables + RLS
│   └── 2026-04-28-usage.sql    Token-usage column on messages
├── scripts/
│   ├── pinecone-smoke.ts       Smoke-test Pinecone connectivity
│   ├── ingest-local.ts         Run the legacy BBC ingest locally
│   ├── retrieve-test.ts        Sanity-check retrieval
│   └── test-extractor.ts       Test article extractor on multiple URLs
├── proxy.ts                    Auth middleware (protects /dashboard)
└── .agent/                     Phase-by-phase build plan + session state
```

---

## Getting started

### 1. Prerequisites

- Node.js 20+
- A Supabase project (free tier works)
- A Pinecone account with a serverless index (1536 dimensions, cosine)
- An Anthropic API key **or** an OpenAI API key (or both)
- An OpenAI key is required for embeddings either way

### 2. Clone and install

```bash
git clone <your-fork-url> askbase
cd askbase
npm install
```

### 3. Set up Supabase

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/schema.sql` - profiles, assistants, sources, RLS, signup trigger
2. `supabase/2026-04-28-chats.sql` - chat history tables
3. `supabase/2026-04-28-usage.sql` - token-usage column

Then under **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production callback) to the redirect allow-list.

### 4. Configure env vars

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

Required:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=askbase

NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional:

```
# LLM toggle (defaults to anthropic)
LLM_PROVIDER=anthropic        # or "openai"
LLM_MODEL=claude-sonnet-4-6   # override default for the chosen provider

# JS-rendering for SPAs / bot-protected sites
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_BROWSER_TOKEN=
CLOUDFLARE_BYPASS_TOKEN=

# Distributed rate limiting (recommended in prod)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Go to `/sign-in` and request a magic link.
2. From the dashboard, click **Create assistant**, give it a name.
3. On the assistant page, paste a URL and wait for the status to flip from `processing` to `ready`.
4. Copy the share link (`/a/<slug>`) and open it in a fresh window - you can chat without signing in.

---

## NPM scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run pinecone:smoke` | Upsert + query a single dummy vector - sanity-check Pinecone creds |
| `npm run ingest:local` | Run the legacy BBC RSS ingest locally |
| `npm run retrieve:test` | Run a sample retrieval against the index |

---

## Limits and design choices

This is an MVP. The current caps are intentionally tight:

- **10 URLs per assistant** (hard-coded in `app/api/sources/route.ts`)
- **50 chunks per URL by default**, configurable per assistant up to 200
- **20 chat requests per minute** per `(assistantId + IP)` - returns HTTP 429 with `Retry-After`
- **60s ingest timeout** - single-page ingest fits easily; site crawling is not implemented
- **Synchronous ingest** - no background queue yet
- **Anonymous chat** is allowed by default; sign-in only enables chat history persistence

Multi-tenant isolation is enforced at three layers:

1. **Supabase RLS** - owners can only see their own rows; the public chat route uses an admin client that explicitly checks `is_public = true`.
2. **Pinecone namespaces** - each assistant gets a UUID namespace. Retrieval is scoped to that namespace; cross-tenant queries are not possible.
3. **Server-only secret key** - `SUPABASE_SECRET_KEY` never reaches the client (no `NEXT_PUBLIC_` prefix), so the admin client only runs on the server.

---

## What's not included yet

Documented as deferred in `.agent/plans/phase-9-multi-tenant-saas.md`:

- Site crawling / sitemap discovery
- Background job queue
- Embeddable widget / iframe distribution
- Custom domains
- Billing and usage caps
- Per-assistant re-ingest scheduling
- Rename slug after creation
- Per-assistant LLM model picker in the UI

---

## How the codebase is organized to grow

The repo follows a strict phase-by-phase build plan recorded in `.agent/plans/`. Each phase has a goal, deliverables, and a verifiable checkpoint, and the source-of-truth spec is `BBC_RAG_NextJS_Build_Plan.pdf` at the repo root.

`.agent/SESSION_STATE.md` is the always-current "where we are" file used to resume work between coding sessions. `CLAUDE.md` defines the working rules (planning before coding, phase commits, session-continuity protocol).

If you want to extend AskBase, the cleanest path is to read the relevant plan file, write a new phase plan, then implement.

---

## License

No license file is included yet - treat this as **all rights reserved** for now..
