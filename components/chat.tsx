'use client';

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Message from "./message";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function Chat() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScrollArea className="flex-1 pr-2">
        <div className="flex flex-col gap-4 py-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground pt-12">
              Ask anything about recent BBC reporting to get started.
            </p>
          )}

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
      </ScrollArea>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about recent BBC reporting..."
          disabled={busy}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
