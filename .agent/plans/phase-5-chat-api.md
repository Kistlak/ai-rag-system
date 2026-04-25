# Phase 5 — Chat API Route

## Goal
Build the streaming `POST /api/chat` endpoint that takes a chat history, retrieves BBC context for the latest user message, and streams an Anthropic Claude response back, with retrieved sources attached as a data annotation for the UI.

## Deliverables
- `app/api/chat/route.ts` — POST handler, edge or node runtime.
- `lib/llm.ts` — thin Anthropic client wrapper (model name, defaults).

## Pre-flight checks
- Phase 4 complete; `retrieve()` and `buildPrompt()` work.
- `ANTHROPIC_API_KEY` set in `.env.local`.

## Steps

### 1. Anthropic wrapper — `lib/llm.ts`
Export:
- `MODEL_ID` constant (default: `claude-sonnet-4-5` per the PDF reference snippet — verify this is still a valid model ID at build time; fall back to the latest Sonnet if not).
- A factory `getModel()` returning the `anthropic(MODEL_ID)` model instance from `@ai-sdk/anthropic`.

This isolates the model choice in one place for easy upgrades.

### 2. Route handler — `app/api/chat/route.ts`
```ts
export const maxDuration = 30;
```

Flow inside `POST(req)`:
1. `const { messages } = await req.json();`
2. Validate with `zod`: `messages` is non-empty array of `{ role, content }`.
3. `const lastUser = messages[messages.length - 1].content` — must be `"user"` role.
4. `const chunks = await retrieve(lastUser, 5);`
5. `const { system } = buildPrompt(lastUser, chunks);`
6. Call `streamText({ model: getModel(), system, messages });`
7. Return `result.toDataStreamResponse({ data: { sources: chunks } })`.

> The PDF reference snippet's `data: { sources: chunks }` form returns sources as a single payload alongside the stream. If the Vercel AI SDK version we install requires `data` to be a `StreamData` object, adapt accordingly — document the deviation here and update `phase-6-chat-ui.md` to match.

### 3. Empty-retrieval handling
If `chunks.length === 0`, return a non-streaming JSON response that the UI can render as "I couldn't find anything in BBC coverage on that. Try rephrasing or asking about a different recent story." — this dovetails with Phase 8 polish.

### 4. Manual smoke test
Boot the dev server (`npm run dev`) and from another terminal:
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is BBC reporting about Ukraine today?"}]}'
```
Expect a streaming response with text tokens.

## Checkpoint
- `curl` against `/api/chat` streams a response token-by-token.
- The response includes the source data annotation (visible in the SSE stream).
- A nonsense / off-topic query returns the graceful fallback.

## Commit
```
Phase 5: streaming chat API with RAG context + source annotations
```

## Notes / pitfalls
- The Vercel AI SDK API surface evolves — verify imports against the installed version (`ai` and `@ai-sdk/anthropic`). If `streamText` signature has changed, update the route and document it here.
- Don't forget `export const maxDuration = 30` — without it, Vercel's default may cut long answers.
- Don't put secrets in the response. Only safe metadata (`articleUrl`, `title`, `publishedAt`) belongs in the sources annotation.
