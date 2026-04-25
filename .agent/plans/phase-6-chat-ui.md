# Phase 6 — Chat UI

## Goal
Build a polished chat UI that calls `/api/chat`, streams tokens, renders markdown, and displays cited BBC sources.

## Deliverables
- `app/page.tsx` — root chat page (centered layout, header, message list, input).
- `components/chat.tsx` — `useChat()` wrapper.
- `components/message.tsx` — single message bubble + Sources footer.
- Tailwind + shadcn/ui styling. Mobile-friendly.

## Pre-flight checks
- Phase 5 complete; `/api/chat` streams successfully.
- shadcn/ui `button`, `input`, `card`, `scroll-area` already added (Phase 1).

## Steps

### 1. Install markdown renderer
```bash
npm i react-markdown remark-gfm
```

### 2. `components/chat.tsx`
- Mark `'use client'`.
- Use `useChat()` from `ai/react` (or `@ai-sdk/react` depending on installed SDK version) pointed at `/api/chat`.
- Render:
  - A scroll-area containing message bubbles (`<Message />` for each).
  - A loading indicator (three-dot bouncing dots) when `isLoading` is true.
  - A form at the bottom with `<Input />` + `<Button type="submit">Send</Button>`.
- Auto-scroll to bottom on new tokens (`useEffect` on `messages.length`).
- Disable the submit button while streaming.

### 3. `components/message.tsx`
- Props: `{ role, content, sources? }`.
- User messages: right-aligned, slate background.
- Assistant messages: left-aligned, white background with border. Render `content` with `<ReactMarkdown remarkPlugins={[remarkGfm]}>`.
- If `sources?.length`: render a `Sources` section below the message:
  ```
  Sources
  1. {title} — {publishedAt}  ↗ (clickable link to articleUrl, opens in new tab)
  2. ...
  ```
- Use a small `<Card>` from shadcn for the sources block.

### 4. Wire sources from the data stream
Read `data` (or `streamData`) from `useChat()`. The chat route attaches `{ sources: chunks }`. Pass the most recent assistant message's matching sources into `<Message />`.

> If the SDK version returns sources differently (e.g. as part of message annotations), adapt the wiring and update this plan.

### 5. `app/page.tsx`
```tsx
export default function Home() {
  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">BBC News RAG</h1>
        <p className="text-sm text-muted-foreground">
          Ask anything about recent BBC reporting.
        </p>
      </header>
      <Chat />
    </main>
  );
}
```

### 6. Smoke test
- `npm run dev` → open `http://localhost:3000`.
- Ask: "What's the latest BBC tech story?"
- Confirm: tokens stream in; sources appear after the answer; clicking a source opens the BBC article in a new tab.
- Test on a narrow viewport (~375px) — layout stays usable.

## Checkpoint
- Streaming visible token-by-token in the browser.
- Sources render below the assistant's message with working links.
- Mobile and desktop layouts both look clean.

## Commit
```
Phase 6: chat UI with streaming, markdown, and source citations
```

## Notes / pitfalls
- `ReactMarkdown` ignores raw HTML by default — that's the safe default; don't enable `rehype-raw` unless needed.
- Auto-scroll: scroll the inner `ScrollArea` viewport, not the page.
- Don't trust `content` in the sources footer — only use the metadata fields (`title`, `articleUrl`, `publishedAt`) which were sanitized at ingest time.
