'use client';

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Cpu,
  Landmark,
  Globe,
  CloudRain,
  ArrowUp,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Message from "./message";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const SUGGESTED_PROMPTS = [
  {
    icon: Cpu,
    label: "Technology",
    text: "What's the latest in BBC technology news?",
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Landmark,
    label: "Politics",
    text: "What's happening in UK politics today?",
    accent: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Globe,
    label: "World",
    text: "Tell me about recent world events on BBC",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: CloudRain,
    label: "Climate",
    text: "What is BBC reporting on climate change?",
    accent: "text-sky-500",
    bg: "bg-sky-500/10",
  },
];

export default function Chat() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea up to ~6 lines
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

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

  return (
    <div className="flex h-full flex-col py-3 sm:py-4 gap-3 sm:gap-4 w-full">
      {/* ── scroll area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {messages.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="flex flex-col gap-5 sm:gap-6 py-2">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}

            {busy && (
              <div className="flex items-center gap-2 px-1 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── input ── */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 relative flex items-end gap-2 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-2 sm:p-2.5 focus-within:border-red-600/50 focus-within:ring-2 focus-within:ring-red-600/20 transition-all"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about recent BBC reporting…"
          disabled={busy}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm sm:text-[15px] text-foreground placeholder:text-muted-foreground/70 outline-none disabled:opacity-50 max-h-[180px]"
          autoFocus
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send message"
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-sm shadow-red-600/30 transition-all hover:from-red-500 hover:to-red-600 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
      <p className="hidden sm:block text-[11px] text-center text-muted-foreground/70 -mt-1">
        Answers may contain inaccuracies. Verify important information with the source articles.
      </p>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-8 sm:gap-10 px-2 py-8">
      <div className="text-center space-y-3 max-w-xl">
        <div className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-700 p-3 shadow-lg shadow-red-600/30">
          <Sparkles className="h-6 w-6 text-white" strokeWidth={2.2} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
          What can I tell you about
          <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent"> BBC News</span>
          {" "}today?
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto text-balance">
          I&apos;ve indexed recent BBC reporting. Ask me anything — I&apos;ll answer with citations and source articles.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
        {SUGGESTED_PROMPTS.map(({ icon: Icon, label, text, accent, bg }) => (
          <button
            key={label}
            onClick={() => onPick(text)}
            className="group relative flex items-start gap-3 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-3.5 text-left transition-all hover:border-border hover:bg-card hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
          >
            <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${accent}`} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="text-sm font-medium leading-snug mt-0.5 text-foreground">
                {text}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
