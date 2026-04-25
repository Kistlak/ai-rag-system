'use client';

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Message from "./message";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const SUGGESTED_PROMPTS = [
  "What's the latest BBC technology news?",
  "What's happening in UK politics?",
  "Tell me about recent world events",
  "What is BBC reporting on climate?",
];

export default function Chat() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(input);
  }

  return (
    <div className="flex h-full flex-col py-4 gap-4">
      {/* ── scroll area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 px-4">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center justify-center rounded bg-red-600 px-2 py-0.5 text-lg font-bold text-white tracking-widest">
                  BBC
                </div>
                <span className="text-xl font-semibold">News Assistant</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                I can answer questions about recent BBC stories using live data from BBC RSS feeds.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="rounded-xl border border-border/60 bg-card/50 p-3 text-sm text-left text-muted-foreground hover:text-foreground hover:border-border hover:bg-card transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-2">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}

            {busy && (
              <div className="flex gap-1 px-1 py-2">
                <span className="animate-bounce text-muted-foreground text-lg leading-none" style={{ animationDelay: "0ms" }}>•</span>
                <span className="animate-bounce text-muted-foreground text-lg leading-none" style={{ animationDelay: "120ms" }}>•</span>
                <span className="animate-bounce text-muted-foreground text-lg leading-none" style={{ animationDelay: "240ms" }}>•</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── input ── */}
      <form onSubmit={handleSubmit} className="shrink-0 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about recent BBC reporting…"
          disabled={busy}
          className="flex-1 bg-card/60 border-border/60 focus-visible:border-red-600/60 focus-visible:ring-red-600/20"
          autoFocus
        />
        <Button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Send
        </Button>
      </form>
    </div>
  );
}
