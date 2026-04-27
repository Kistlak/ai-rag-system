'use client';

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, type UIMessage, type SourceUrlUIPart } from "ai";
import {
  Cpu,
  Landmark,
  Globe,
  CloudRain,
  ArrowUp,
  Sparkles,
  Search,
  BookOpen,
  PenLine,
  Check,
  TrendingUp,
  Newspaper,
  MessageSquare,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Message from "./message";

const SUGGESTED_PROMPTS = [
  {
    icon: Cpu,
    label: "Technology",
    text: "What's the latest in BBC technology news?",
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
  },
  {
    icon: Landmark,
    label: "Politics",
    text: "What's happening in UK politics today?",
    accent: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
  },
  {
    icon: Globe,
    label: "World",
    text: "Tell me about recent world events on BBC",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
  },
  {
    icon: CloudRain,
    label: "Climate",
    text: "What is BBC reporting on climate change?",
    accent: "text-sky-500",
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/20",
  },
] as const;

const TRENDING_CHIPS = [
  "Today's top headlines",
  "Markets this morning",
  "What's happening in Westminster",
  "Tech stories worth reading",
  "Climate update",
] as const;

interface Exchange {
  id: string;
  user?: UIMessage;
  assistant?: UIMessage;
}

interface Timing {
  start: number;
  durationMs?: number;
}

function messageText(m: UIMessage | undefined): string {
  if (!m) return "";
  return m.parts.filter(isTextUIPart).map((p) => p.text).join("");
}

function messageSourceCount(m: UIMessage | undefined): number {
  if (!m) return 0;
  return m.parts.filter((p): p is SourceUrlUIPart => p.type === "source-url").length;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface ChatProps {
  assistantId?: string;
}

export default function Chat({ assistantId }: ChatProps = {}) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      ...(assistantId ? { body: { assistantId } } : {}),
    }),
    [assistantId]
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const submitted = status === "submitted";
  const streaming = status === "streaming";
  const busy = submitted || streaming;

  const lastMessage = messages[messages.length - 1];
  const noAssistantYet = !lastMessage || lastMessage.role === "user";
  const showSearching = busy && noAssistantYet;

  // Group messages into exchanges (one user + the assistant reply that follows)
  const exchanges = useMemo<Exchange[]>(() => {
    const out: Exchange[] = [];
    let current: Exchange | null = null;
    for (const msg of messages) {
      if (msg.role === "user") {
        if (current) out.push(current);
        current = { id: `ex-${msg.id}`, user: msg };
      } else if (msg.role === "assistant") {
        if (!current) current = { id: `ex-${msg.id}` };
        current.assistant = msg;
      }
    }
    if (current) out.push(current);
    return out;
  }, [messages]);

  const [activeId, setActiveId] = useState<string | null>(null);

  // Default the active exchange to the latest one when new ones land
  useEffect(() => {
    if (exchanges.length === 0) {
      setActiveId(null);
      return;
    }
    const latest = exchanges[exchanges.length - 1].id;
    setActiveId((prev) => prev ?? latest);
  }, [exchanges]);

  // Per-exchange timing so we can show "answered in 3.2s"
  const [timings, setTimings] = useState<Record<string, Timing>>({});
  const wasBusyRef = useRef(false);
  const activeTimingExRef = useRef<string | null>(null);

  useEffect(() => {
    const last = exchanges[exchanges.length - 1];
    if (busy && !wasBusyRef.current && last) {
      activeTimingExRef.current = last.id;
      setTimings((prev) =>
        prev[last.id] ? prev : { ...prev, [last.id]: { start: Date.now() } }
      );
    } else if (!busy && wasBusyRef.current) {
      const exId = activeTimingExRef.current;
      if (exId) {
        setTimings((prev) => {
          const t = prev[exId];
          if (!t || t.durationMs !== undefined) return prev;
          return { ...prev, [exId]: { ...t, durationMs: Date.now() - t.start } };
        });
        activeTimingExRef.current = null;
      }
    }
    wasBusyRef.current = busy;
  }, [busy, exchanges]);

  // Anchor each new exchange's QUESTION at the top of the left pane on submit.
  // The answer streams in below it; we don't auto-scroll during streaming, so
  // the question stays put and the user reads top-down. Avoids tail-chasing.
  const seenExchangeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const root = leftScrollRef.current;
    if (!root || exchanges.length === 0) return;

    const newIds: string[] = [];
    for (const ex of exchanges) {
      if (!seenExchangeIdsRef.current.has(ex.id)) {
        newIds.push(ex.id);
        seenExchangeIdsRef.current.add(ex.id);
      }
    }
    if (newIds.length === 0) return;

    const targetId = newIds[newIds.length - 1];
    requestAnimationFrame(() => {
      const el = root.querySelector(`#${CSS.escape(targetId)}`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(targetId);
    });
  }, [exchanges]);

  // Keep the right-rail's active card in view (smooth, only if off-screen).
  useEffect(() => {
    if (!activeId) return;
    const root = rightScrollRef.current;
    if (!root) return;
    const el = root.querySelector('[aria-current="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  // IntersectionObserver: track which exchange is currently in view in the left pane
  useEffect(() => {
    const root = leftScrollRef.current;
    if (!root || exchanges.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // pick the one whose top is closest to the top of the viewport
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveId(top.target.id);
      },
      {
        root,
        rootMargin: "-15% 0px -60% 0px",
        threshold: 0,
      }
    );

    exchanges.forEach((ex) => {
      const el = root.querySelector(`#${CSS.escape(ex.id)}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [exchanges]);

  // Auto-resize textarea up to ~6 lines
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  // "/" focuses the composer (when not already typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = useCallback(
    (text: string) => {
      if (!text.trim() || busy) return;
      sendMessage({ text });
      setInput("");
    },
    [busy, sendMessage]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  const scrollToExchange = useCallback((id: string) => {
    const root = leftScrollRef.current;
    if (!root) return;
    const el = root.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }, []);

  const composerProps = {
    input,
    setInput,
    onSubmit: handleSubmit,
    onKeyDown: handleKeyDown,
    textareaRef,
    busy,
  };

  const isEmpty = messages.length === 0;

  // Empty state — full-width hero, no two-pane split
  if (isEmpty) {
    return (
      <div className="flex h-full flex-col py-3 sm:py-5 gap-3 sm:gap-4 w-full">
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <EmptyState onPick={submit} />
        </div>
        <div className="shrink-0 max-w-3xl w-full mx-auto">
          <Composer {...composerProps} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-0 lg:gap-6 py-3 sm:py-5">
      {/* ─── LEFT PANE — full reading view ─── */}
      <section className="flex flex-1 min-w-0 flex-col gap-3 sm:gap-4">
        <div
          ref={leftScrollRef}
          className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1"
        >
          <div className="flex flex-col gap-7 sm:gap-9 py-2 max-w-3xl mx-auto">
            {exchanges.map((ex, i) => {
              const isLast = i === exchanges.length - 1;
              const t = timings[ex.id];
              return (
                <ExchangeSection
                  key={ex.id}
                  exchange={ex}
                  streaming={streaming && isLast}
                  isActive={activeId === ex.id}
                  durationMs={t?.durationMs}
                />
              );
            })}

            {showSearching && <SearchingState />}
          </div>
        </div>

        {/* Mobile composer (lg-) */}
        <div className="lg:hidden max-w-3xl w-full mx-auto">
          <Composer {...composerProps} />
        </div>
      </section>

      {/* ─── RIGHT PANE — compact thread + composer (lg+) ─── */}
      <aside className="hidden lg:flex w-[360px] xl:w-[400px] shrink-0 flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden ring-soft">
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.4} />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Conversation
            </h3>
          </div>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground tabular-nums">
            {exchanges.length}
          </span>
        </div>

        <div ref={rightScrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          <ol className="flex flex-col gap-2">
            {exchanges.map((ex, i) => {
              const isLast = i === exchanges.length - 1;
              const t = timings[ex.id];
              return (
                <ExchangeCard
                  key={ex.id}
                  exchange={ex}
                  index={i}
                  active={activeId === ex.id}
                  onClick={() => scrollToExchange(ex.id)}
                  streaming={streaming && isLast}
                  busyHere={busy && isLast}
                  durationMs={t?.durationMs}
                />
              );
            })}
          </ol>
        </div>

        <div className="shrink-0 border-t border-border/50 p-3 bg-background/40">
          <Composer {...composerProps} compact />
        </div>
      </aside>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Composer
   ────────────────────────────────────────────────────────── */
interface ComposerProps {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  busy: boolean;
  compact?: boolean;
}

function Composer({
  input,
  setInput,
  onSubmit,
  onKeyDown,
  textareaRef,
  busy,
  compact = false,
}: ComposerProps) {
  const charCount = input.length;
  const showCount = charCount > 280;

  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 group relative pb-[env(safe-area-inset-bottom)]"
    >
      <div
        className={`
          relative flex items-end gap-2 rounded-3xl
          border border-border/60 bg-card/70 backdrop-blur-2xl
          ${compact ? "px-2.5 py-2" : "px-3 py-2.5 sm:px-3.5 sm:py-3"}
          shadow-sm transition-all
          focus-within:border-red-600/40
          focus-within:shadow-[0_0_0_4px_rgba(232,0,0,0.08),0_8px_24px_-12px_rgba(232,0,0,0.25)]
        `}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={compact ? "Ask a follow-up…" : "Ask anything about BBC News…"}
          disabled={busy}
          rows={1}
          className={`
            flex-1 resize-none bg-transparent
            px-1 py-1.5 text-foreground
            placeholder:text-muted-foreground/70 outline-none
            disabled:opacity-50 max-h-[180px]
            ${compact ? "text-[14px]" : "text-[15px] sm:text-base"}
          `}
        />

        <div className="flex items-end gap-1.5 pb-0.5">
          {showCount && !compact && (
            <span className="hidden sm:inline-block text-[11px] tabular-nums text-muted-foreground/70 mb-2.5">
              {charCount}
            </span>
          )}
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className={`
              shrink-0 inline-flex items-center justify-center rounded-2xl
              bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)]
              text-white shadow-md shadow-red-600/25 ring-soft
              transition-all duration-200
              enabled:hover:scale-[1.04] enabled:active:scale-95
              enabled:hover:shadow-lg enabled:hover:shadow-red-600/30
              disabled:opacity-30 disabled:cursor-not-allowed
              ${compact ? "h-9 w-9" : "h-10 w-10"}
            `}
          >
            {busy ? (
              <span className="block h-2 w-2 rounded-sm bg-white animate-pulse" />
            ) : (
              <ArrowUp className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={2.6} />
            )}
          </button>
        </div>
      </div>

      {!compact && (
        <div className="mt-2 flex items-center justify-between gap-3 px-1">
          <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border/60 bg-muted px-1 text-[10px] font-mono">/</kbd>
            to focus
            <span className="text-muted-foreground/40">·</span>
            <kbd className="inline-flex h-4 items-center justify-center rounded border border-border/60 bg-muted px-1 text-[10px] font-mono">Enter</kbd>
            to send
          </p>
          <p className="ml-auto text-[10px] sm:text-[11px] text-muted-foreground/60 text-right">
            Answers may contain inaccuracies. Verify with sources.
          </p>
        </div>
      )}
    </form>
  );
}

/* ──────────────────────────────────────────────────────────
   ExchangeSection — one user→assistant pair on the LEFT pane
   ────────────────────────────────────────────────────────── */
function ExchangeSection({
  exchange,
  streaming,
  isActive,
  durationMs,
}: {
  exchange: Exchange;
  streaming: boolean;
  isActive: boolean;
  durationMs?: number;
}) {
  const aiText = messageText(exchange.assistant);
  const showDone = !streaming && exchange.assistant && aiText.length > 0;

  return (
    <section
      id={exchange.id}
      data-active={isActive}
      className="scroll-mt-4 flex flex-col gap-6 sm:gap-7"
    >
      {exchange.user && <Message message={exchange.user} />}
      {exchange.assistant && (
        <Message message={exchange.assistant} streaming={streaming} />
      )}
      {showDone && (
        <div className="flex items-center gap-2 -mt-3 sm:-mt-4 pl-10 sm:pl-11 animate-fade-in-up">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
          </div>
          <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            Answered
            {durationMs !== undefined && (
              <span className="text-muted-foreground font-normal">
                {" "}· {formatDuration(durationMs)}
              </span>
            )}
          </span>
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   ExchangeCard — compact preview on the RIGHT pane
   ────────────────────────────────────────────────────────── */
function ExchangeCard({
  exchange,
  index,
  active,
  onClick,
  streaming,
  busyHere,
  durationMs,
}: {
  exchange: Exchange;
  index: number;
  active: boolean;
  onClick: () => void;
  streaming: boolean;
  busyHere: boolean;
  durationMs?: number;
}) {
  const userText = messageText(exchange.user);
  const aiText = messageText(exchange.assistant);
  const sourceCount = messageSourceCount(exchange.assistant);
  const isStreamingHere = busyHere && !aiText;
  const isDone = !busyHere && aiText.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={`
          group w-full text-left rounded-xl border p-3
          transition-all
          ${
            active
              ? "border-red-500/40 bg-red-500/[0.04] dark:bg-red-500/[0.06] shadow-sm"
              : "border-border/50 bg-card/40 hover:border-border hover:bg-card/70"
          }
        `}
      >
        <div className="flex items-start gap-2">
          <span
            className={`
              shrink-0 mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1
              text-[10px] font-bold tabular-nums
              ${active ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"}
            `}
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-[13px] font-semibold leading-snug line-clamp-2 ${
                  active ? "text-foreground" : "text-foreground/90"
                }`}
              >
                {userText || "…"}
              </p>
              {isDone && (
                <span
                  className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30"
                  aria-label="Answered"
                  title={durationMs !== undefined ? `Answered in ${formatDuration(durationMs)}` : "Answered"}
                >
                  <Check className="h-2.5 w-2.5 text-emerald-500" strokeWidth={3.5} />
                </span>
              )}
            </div>

            {(aiText || isStreamingHere) && (
              <div className="mt-2 flex gap-1.5">
                <div
                  className={`
                    shrink-0 mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full
                    ${
                      isDone
                        ? "bg-emerald-500/20"
                        : "bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-red-600/30"
                    }
                  `}
                >
                  {isDone ? (
                    <Check className="h-2 w-2 text-emerald-500" strokeWidth={3.5} />
                  ) : (
                    <Sparkles className="h-2 w-2 text-white" strokeWidth={2.6} />
                  )}
                </div>
                {aiText ? (
                  <p className="text-[12px] leading-snug text-muted-foreground line-clamp-2">
                    {aiText}
                  </p>
                ) : (
                  <span className="text-[12px] leading-snug text-muted-foreground/80 animate-thinking-dots inline-flex">
                    Composing<span>.</span><span>.</span><span>.</span>
                  </span>
                )}
              </div>
            )}

            <div className="mt-2 flex items-center gap-1.5">
              {sourceCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <Newspaper className="h-2.5 w-2.5" strokeWidth={2.4} />
                  {sourceCount}
                </span>
              )}
              {isDone && durationMs !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatDuration(durationMs)}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

/* ──────────────────────────────────────────────────────────
   Empty state — hero, trending chips, prompt cards
   ────────────────────────────────────────────────────────── */
function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-9 sm:gap-10 px-2 py-8">
      <div className="text-center space-y-4 max-w-xl animate-fade-in-up">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 blur-xl opacity-40" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-xl shadow-red-600/30 ring-soft">
            <Sparkles className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance leading-[1.1]">
          What&apos;s on the wire
          <br className="hidden sm:inline" />
          {" "}from <span className="text-brand-gradient">BBC News</span>?
        </h2>
        <p className="text-[15px] text-muted-foreground max-w-md mx-auto text-balance leading-relaxed">
          I&apos;ve indexed recent BBC reporting. Ask anything — you&apos;ll get a grounded answer with linked source articles.
        </p>
      </div>

      <div className="w-full max-w-2xl animate-fade-in-up [animation-delay:80ms]">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.2} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trending
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
          {TRENDING_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onPick(chip)}
              className="
                shrink-0 snap-start
                inline-flex items-center gap-1.5 rounded-full
                border border-border/60 bg-card/60 backdrop-blur-sm
                px-3.5 py-1.5 text-[13px] font-medium text-foreground/80
                transition-all hover:border-border hover:bg-card hover:text-foreground
                hover:-translate-y-0.5 hover:shadow-sm
                active:translate-y-0
              "
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl animate-fade-in-up [animation-delay:160ms]">
        {SUGGESTED_PROMPTS.map(({ icon: Icon, label, text, accent, bg, ring }) => (
          <button
            key={label}
            onClick={() => onPick(text)}
            className="
              group relative flex items-start gap-3 rounded-2xl
              border border-border/50 bg-card/50 backdrop-blur-sm
              p-3.5 sm:p-4 text-left transition-all
              hover:border-border hover:bg-card
              hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.04]
              dark:hover:shadow-black/40
              active:translate-y-0
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40
            "
          >
            <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${bg} ring-1 ${ring}`}>
              <Icon className={`h-[18px] w-[18px] ${accent}`} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {label}
              </p>
              <p className="text-[14px] sm:text-[15px] font-medium leading-snug mt-1 text-foreground text-pretty">
                {text}
              </p>
            </div>
            <ArrowUp className="absolute top-3.5 right-3.5 h-3.5 w-3.5 rotate-45 text-muted-foreground/30 transition-all group-hover:text-foreground group-hover:rotate-0 group-hover:scale-110" strokeWidth={2.4} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Searching state — staged pipeline + skeleton sources
   ────────────────────────────────────────────────────────── */
function SearchingState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, []);

  const stages = useMemo(
    () => [
      { id: "search",  label: "Searching the BBC archive", icon: Search,   at: 0 },
      { id: "read",    label: "Reading relevant articles", icon: BookOpen, at: 1100 },
      { id: "compose", label: "Composing your answer",     icon: PenLine,  at: 2400 },
    ],
    []
  );

  let activeIdx = 0;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (elapsed >= stages[i].at) {
      activeIdx = i;
      break;
    }
  }

  return (
    <div className="flex gap-2.5 sm:gap-3 animate-fade-in">
      <div className="shrink-0 relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-red-600/30 mt-0.5 animate-pulse-ring">
        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-3 sm:p-3.5">
          {stages.map((s, i) => {
            const isDone = i < activeIdx;
            const isActive = i === activeIdx;
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2.5 text-[13px] sm:text-sm transition-all ${
                  isDone ? "text-muted-foreground" : isActive ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                <div
                  className={`
                    shrink-0 flex h-5 w-5 items-center justify-center rounded-full transition-all
                    ${isDone ? "bg-emerald-500/15 text-emerald-500" : ""}
                    ${isActive ? "bg-red-500/15 text-red-500" : ""}
                    ${!isDone && !isActive ? "bg-muted/60 text-muted-foreground/50" : ""}
                  `}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : isActive ? (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  ) : (
                    <Icon className="h-3 w-3" strokeWidth={2.2} />
                  )}
                </div>
                <span className={`truncate ${isActive ? "font-medium" : ""}`}>
                  {s.label}
                  {isActive && (
                    <span className="ml-1 animate-thinking-dots inline-flex">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {activeIdx >= 1 && (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              <Newspaper className="h-3.5 w-3.5" />
              <span>Pulling sources</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm animate-shimmer"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="aspect-video bg-muted/60" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="h-3 w-[85%] rounded bg-muted/60" />
                    <div className="h-3 w-[60%] rounded bg-muted/60" />
                    <div className="h-2.5 w-[40%] rounded bg-muted/40 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
