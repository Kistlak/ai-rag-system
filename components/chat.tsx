'use client';

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, type UIMessage, type SourceUrlUIPart } from "ai";
import {
  ArrowUp, Sparkles, Search, Book, Check, MessageSquare, Plus, Trash2, Loader2, Menu, X, Download,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Message from "./message";

export interface ChatUser {
  id: string;
  email: string;
  initial: string;
}

export interface ChatSummary {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  parts: unknown[];
}

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

function buildMarkdownExport(
  title: string,
  messages: UIMessage[],
  assistantName?: string
): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  if (assistantName) lines.push(`\n_Assistant: ${assistantName}_`);
  lines.push(`\n_Exported: ${new Date().toISOString()}_\n`);

  for (const msg of messages) {
    const text = msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
    if (msg.role === "user") {
      lines.push(`\n## You\n\n${text}`);
    } else if (msg.role === "assistant") {
      lines.push(`\n## Assistant\n\n${text}`);
      const sources = msg.parts.filter((p): p is SourceUrlUIPart => p.type === "source-url");
      if (sources.length > 0) {
        lines.push(`\n**Sources**`);
        sources.forEach((s, i) => {
          let title = s.url;
          try {
            const meta = JSON.parse(s.title ?? "{}");
            if (meta?.t) title = meta.t;
          } catch {}
          lines.push(`${i + 1}. [${title}](${s.url})`);
        });
      }
    }
  }
  return lines.join("\n");
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

interface ChatProps {
  assistantId?: string;
  assistantName?: string;
  viewer?: ChatUser | null;
  initialChats?: ChatSummary[];
  initialActiveChatId?: string | null;
  initialMessages?: PersistedMessage[];
}

export default function Chat({
  assistantId,
  assistantName,
  viewer = null,
  initialChats = [],
  initialActiveChatId = null,
  initialMessages = [],
}: ChatProps = {}) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      ...(assistantId ? { body: { assistantId } } : {}),
    }),
    [assistantId]
  );

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    messages: initialMessages as unknown as UIMessage[],
  });

  const [input, setInput] = useState("");
  const [chats, setChats] = useState<ChatSummary[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialActiveChatId);
  const [switchingChat, setSwitchingChat] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");

  const filteredChats = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => (c.title ?? "").toLowerCase().includes(q));
  }, [chats, chatSearch]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const submitted = status === "submitted";
  const streaming = status === "streaming";
  const busy = submitted || streaming;

  const lastMessage = messages[messages.length - 1];
  const noAssistantYet = !lastMessage || lastMessage.role === "user";
  const showSearching = busy && noAssistantYet;

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

  useEffect(() => {
    if (exchanges.length === 0) { setActiveId(null); return; }
    const latest = exchanges[exchanges.length - 1].id;
    setActiveId((prev) => prev ?? latest);
  }, [exchanges]);

  const [timings, setTimings] = useState<Record<string, Timing>>({});
  const wasBusyRef = useRef(false);
  const activeTimingExRef = useRef<string | null>(null);

  useEffect(() => {
    const last = exchanges[exchanges.length - 1];
    if (busy && !wasBusyRef.current && last) {
      activeTimingExRef.current = last.id;
      setTimings((prev) => prev[last.id] ? prev : { ...prev, [last.id]: { start: Date.now() } });
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

  useEffect(() => {
    if (!activeId) return;
    const root = rightScrollRef.current;
    if (!root) return;
    const el = root.querySelector('[aria-current="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  useEffect(() => {
    const root = leftScrollRef.current;
    if (!root || exchanges.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => a.boundingClientRect.top < b.boundingClientRect.top ? a : b);
        setActiveId(top.target.id);
      },
      { root, rootMargin: "-15% 0px -60% 0px", threshold: 0 }
    );
    exchanges.forEach((ex) => {
      const el = root.querySelector(`#${CSS.escape(ex.id)}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [exchanges]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "/" && !isTyping) { e.preventDefault(); textareaRef.current?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = useCallback(async (text: string) => {
    if (!text.trim() || busy) return;

    let chatIdToUse = activeChatId;

    // Lazy-create a chat row for signed-in users on first message
    if (viewer && !chatIdToUse && assistantId) {
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assistantId, title: text.slice(0, 80) }),
        });
        if (res.ok) {
          const json = await res.json();
          chatIdToUse = json.chat.id;
          setActiveChatId(chatIdToUse);
          setChats((prev) => [json.chat, ...prev]);
        } else {
          const json = await res.json().catch(() => ({}));
          console.error(`[chat] Failed to create chat (HTTP ${res.status}):`, json.error ?? "no body");
        }
      } catch (err) {
        console.error("[chat] Network error creating chat:", err);
      }
    }

    sendMessage({ text }, chatIdToUse ? { body: { chatId: chatIdToUse } } : undefined);
    setInput("");
  }, [busy, viewer, activeChatId, assistantId, sendMessage]);

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); submit(input); }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
  }

  const scrollToExchange = useCallback((id: string) => {
    const root = leftScrollRef.current;
    if (!root) return;
    const el = root.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }, []);

  // ── Chat list operations (signed-in users only) ────────────────────────
  const startNewChat = useCallback(() => {
    if (busy || switchingChat) return;
    setActiveChatId(null);
    setMessages([]);
    seenExchangeIdsRef.current = new Set();
    setActiveId(null);
    textareaRef.current?.focus();
  }, [busy, switchingChat, setMessages]);

  const selectChat = useCallback(async (id: string) => {
    if (id === activeChatId || busy) return;
    setSwitchingChat(true);
    try {
      const res = await fetch(`/api/chats/${id}/messages`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages as UIMessage[]);
        setActiveChatId(id);
        seenExchangeIdsRef.current = new Set();
        setActiveId(null);
      }
    } finally {
      setSwitchingChat(false);
    }
  }, [activeChatId, busy, setMessages]);

  const exportActiveChat = useCallback(() => {
    if (messages.length === 0) return;
    const currentChat = activeChatId ? chats.find((c) => c.id === activeChatId) ?? null : null;
    const title = currentChat?.title ?? assistantName ?? "Chat";
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "chat";
    const md = buildMarkdownExport(title, messages, assistantName);
    downloadMarkdown(`${safeName}-${new Date().toISOString().slice(0, 10)}.md`, md);
  }, [messages, activeChatId, chats, assistantName]);

  const renameChat = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, title: trimmed } : c));
    try {
      await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch {
      // Soft-fail: optimistic update stays
    }
  }, []);

  const deleteChat = useCallback(async (id: string) => {
    setDeletingChatId(id);
    try {
      await fetch(`/api/chats/${id}`, { method: "DELETE" });
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        setActiveChatId(null);
        setMessages([]);
        seenExchangeIdsRef.current = new Set();
      }
    } finally {
      setDeletingChatId(null);
    }
  }, [activeChatId, setMessages]);

  const composerProps = { input, setInput, onSubmit: handleSubmit, onKeyDown: handleKeyDown, textareaRef, busy: busy || switchingChat, assistantName };
  const isEmpty = messages.length === 0;
  const activeChat = activeChatId ? chats.find((c) => c.id === activeChatId) ?? null : null;

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col py-3 sm:py-5 gap-3 sm:gap-4 w-full">
        {viewer && (
          <ChatTitleBar
            activeChat={activeChat}
            onNewChat={startNewChat}
            onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
            onRename={renameChat}
            onExport={exportActiveChat}
            canExport={messages.length > 0}
            disabled={busy || switchingChat}
            assistantName={assistantName}
          />
        )}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          <EmptyState assistantName={assistantName} />
        </div>
        <div className="shrink-0 max-w-3xl w-full mx-auto">
          <Composer {...composerProps} />
        </div>
        {viewer && (
          <MobileChatDrawer
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            chats={filteredChats}
            totalChats={chats.length}
            search={chatSearch}
            onSearchChange={setChatSearch}
            activeChatId={activeChatId}
            onSelect={selectChat}
            onDelete={deleteChat}
            onNewChat={startNewChat}
            switching={switchingChat}
            deletingChatId={deletingChatId}
            disabled={busy}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-0 lg:gap-5 py-3 sm:py-5">
      {/* Left pane */}
      <section className="flex flex-1 min-w-0 flex-col gap-3 sm:gap-4">
        {viewer && (
          <ChatTitleBar
            activeChat={activeChat}
            onNewChat={startNewChat}
            onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
            onRename={renameChat}
            onExport={exportActiveChat}
            canExport={messages.length > 0}
            disabled={busy || switchingChat}
            assistantName={assistantName}
          />
        )}
        <div ref={leftScrollRef} className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
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
            {showSearching && <LoadingPipeline />}
            {error && !busy && (
              <div className="flex gap-2.5 sm:gap-3 animate-fade-in-up">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-red-500" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <p className="text-[13px] font-medium text-red-600 dark:text-red-400">Something went wrong</p>
                  <p className="mt-1 text-[12px] text-red-500/70">{error.message ?? "The request failed. Please try again."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="lg:hidden max-w-3xl w-full mx-auto">
          <Composer {...composerProps} />
        </div>
      </section>

      {/* Right sidebar (desktop) */}
      <aside className="hidden lg:flex w-[340px] xl:w-[360px] shrink-0 flex-col rounded-2xl border border-border bg-card/50 backdrop-blur-xl overflow-hidden">
        {viewer && (
          <ChatListSidebar
            chats={filteredChats}
            totalChats={chats.length}
            search={chatSearch}
            onSearchChange={setChatSearch}
            activeChatId={activeChatId}
            onSelect={selectChat}
            onDelete={deleteChat}
            onNewChat={startNewChat}
            switching={switchingChat}
            deletingChatId={deletingChatId}
            disabled={busy}
          />
        )}

        <ConversationSidebar
          exchanges={exchanges}
          activeId={activeId}
          timings={timings}
          streaming={streaming}
          busy={busy}
          scrollRef={rightScrollRef}
          onScrollTo={scrollToExchange}
        />

        <div className="shrink-0 border-t border-border p-3 bg-background/40">
          <Composer {...composerProps} compact />
        </div>
      </aside>

      {viewer && (
        <MobileChatDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          chats={filteredChats}
          totalChats={chats.length}
          search={chatSearch}
          onSearchChange={setChatSearch}
          activeChatId={activeChatId}
          onSelect={selectChat}
          onDelete={deleteChat}
          onNewChat={startNewChat}
          switching={switchingChat}
          deletingChatId={deletingChatId}
          disabled={busy}
        />
      )}
    </div>
  );
}

/* ── Chat Title Bar (signed-in users) ────────────────────────── */
function ChatTitleBar({
  activeChat, onNewChat, onOpenMobileDrawer, onRename, onExport, canExport, disabled, assistantName,
}: {
  activeChat: ChatSummary | null;
  onNewChat: () => void;
  onOpenMobileDrawer: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onExport: () => void;
  canExport: boolean;
  disabled: boolean;
  assistantName?: string;
}) {
  const fallback = assistantName ? `New chat · ${assistantName}` : "New chat";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  // Cancel edit when active chat changes
  useEffect(() => { setEditing(false); }, [activeChat?.id]);

  function startEdit() {
    if (!activeChat) return;
    setDraft(activeChat.title ?? "");
    setEditing(true);
  }
  function save() {
    if (!activeChat) return;
    const t = draft.trim();
    if (t && t !== activeChat.title) onRename(activeChat.id, t);
    setEditing(false);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
  }

  return (
    <div className="shrink-0 flex items-center gap-2 max-w-3xl w-full mx-auto rounded-xl border border-border bg-card/40 px-2 py-2">
      <button
        type="button"
        onClick={onOpenMobileDrawer}
        aria-label="Show chat history"
        className="lg:hidden shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Menu className="h-4 w-4" strokeWidth={2} />
      </button>

      {editing && activeChat ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={save}
          maxLength={120}
          className="flex-1 min-w-0 rounded-lg border border-[oklch(0.62_0.23_27/0.4)] bg-background px-2 py-1 text-[13px] font-medium text-foreground outline-none focus:ring-2 focus:ring-[oklch(0.62_0.23_27/0.12)]"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          disabled={!activeChat}
          title={activeChat ? "Click to rename" : undefined}
          className="flex-1 min-w-0 truncate text-left text-[13px] font-medium text-foreground hover:text-[oklch(0.58_0.22_27)] disabled:cursor-default disabled:hover:text-foreground transition-colors px-1"
        >
          {activeChat?.title ?? fallback}
        </button>
      )}

      <button
        type="button"
        onClick={onExport}
        disabled={!canExport}
        aria-label="Export chat as markdown"
        title="Export as markdown"
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onNewChat}
        disabled={disabled}
        className="shrink-0 flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <Plus className="h-3 w-3" strokeWidth={2.4} />
        New chat
      </button>
    </div>
  );
}

/* ── Mobile Chat Drawer ──────────────────────────────────────── */
function MobileChatDrawer({
  open, onClose, chats, totalChats, search, onSearchChange, activeChatId, onSelect, onDelete, onNewChat, switching, deletingChatId, disabled,
}: {
  open: boolean;
  onClose: () => void;
  chats: ChatSummary[];
  totalChats: number;
  search: string;
  onSearchChange: (v: string) => void;
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  switching: boolean;
  deletingChatId: string | null;
  disabled: boolean;
}) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-[300px] max-w-[80%] flex-col bg-background border-r border-border shadow-2xl animate-slide-in-left">
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.4} />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Your chats</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="shrink-0 px-3 py-3 border-b border-border space-y-2.5">
          <button
            type="button"
            onClick={() => { onNewChat(); onClose(); }}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] py-2 text-[13px] font-medium text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.25)] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            New chat
          </button>
          {totalChats > 3 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" strokeWidth={2} />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search chats…"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-2 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[oklch(0.62_0.23_27/0.5)]"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {chats.length === 0 ? (
            <p className="text-center text-[12px] text-muted-foreground/70 py-6">{search ? "No chats match" : "No chats yet"}</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {chats.map((chat) => {
                const active = chat.id === activeChatId;
                const deleting = deletingChatId === chat.id;
                return (
                  <li key={chat.id}>
                    <div
                      className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                        active
                          ? "border-[oklch(0.62_0.23_27/0.4)] bg-[oklch(0.62_0.23_27/0.04)] dark:bg-[oklch(0.62_0.23_27/0.06)] shadow-sm"
                          : "border-border bg-card/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => { onSelect(chat.id); onClose(); }}
                        disabled={switching || disabled}
                        aria-current={active ? "true" : undefined}
                        className="flex-1 min-w-0 text-left disabled:opacity-50"
                      >
                        <p className={`truncate text-[13px] font-medium ${active ? "text-foreground" : "text-foreground/90"}`}>
                          {chat.title ?? "Untitled chat"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{relativeTime(chat.updated_at)}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(chat.id)}
                        disabled={deleting}
                        aria-label="Delete chat"
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" strokeWidth={2} />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Chat List Sidebar (signed-in users) ─────────────────────── */
function ChatListSidebar({
  chats, totalChats, search, onSearchChange, activeChatId, onSelect, onDelete, onNewChat, switching, deletingChatId, disabled,
}: {
  chats: ChatSummary[];
  totalChats: number;
  search: string;
  onSearchChange: (v: string) => void;
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  switching: boolean;
  deletingChatId: string | null;
  disabled: boolean;
}) {
  return (
    <div className="shrink-0 flex flex-col max-h-[45%] border-b border-border">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.4} />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Your chats</h3>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          aria-label="New chat"
          className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] px-2 py-1 text-[10px] font-bold text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.25)] hover:-translate-y-px transition-all disabled:opacity-50"
        >
          <Plus className="h-3 w-3" strokeWidth={2.6} />
          New
        </button>
      </div>

      {totalChats > 3 && (
        <div className="shrink-0 px-3 pt-2.5 pb-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/60" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-lg border border-border bg-background pl-7 pr-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[oklch(0.62_0.23_27/0.5)]"
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {chats.length === 0 ? (
          <p className="text-center text-[12px] text-muted-foreground/70 py-4">{search ? "No chats match" : "No chats yet"}</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {chats.map((chat) => {
              const active = chat.id === activeChatId;
              const deleting = deletingChatId === chat.id;
              return (
                <li key={chat.id}>
                  <div
                    className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                      active
                        ? "border-[oklch(0.62_0.23_27/0.4)] bg-[oklch(0.62_0.23_27/0.04)] dark:bg-[oklch(0.62_0.23_27/0.06)] shadow-sm"
                        : "border-border bg-card/40 hover:border-border/80 hover:bg-card/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(chat.id)}
                      disabled={switching || disabled}
                      aria-current={active ? "true" : undefined}
                      className="flex-1 min-w-0 text-left disabled:opacity-50"
                    >
                      <p className={`truncate text-[13px] font-medium ${active ? "text-foreground" : "text-foreground/90"}`}>
                        {chat.title ?? "Untitled chat"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">{relativeTime(chat.updated_at)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(chat.id)}
                      disabled={deleting}
                      aria-label="Delete chat"
                      className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" strokeWidth={2} />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ── Conversation Sidebar — current chat's exchanges (clickable scroll-to) ── */
function ConversationSidebar({
  exchanges, activeId, timings, streaming, busy, scrollRef, onScrollTo,
}: {
  exchanges: Exchange[];
  activeId: string | null;
  timings: Record<string, Timing>;
  streaming: boolean;
  busy: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScrollTo: (id: string) => void;
}) {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.4} />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Conversation</h3>
        </div>
        {exchanges.length > 0 && (
          <span className="rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] px-2 py-0.5 text-[10px] font-bold text-white">
            {exchanges.length}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {exchanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <MessageSquare className="h-7 w-7 text-muted-foreground/40 mb-2.5" strokeWidth={1.5} />
            <p className="text-[13px] leading-relaxed text-muted-foreground/70">Your conversation thread will appear here</p>
          </div>
        ) : (
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
                  onClick={() => onScrollTo(ex.id)}
                  streaming={streaming && isLast}
                  busyHere={busy && isLast}
                  durationMs={t?.durationMs}
                />
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ── Loading Pipeline ───────────────────────────────────────── */
function LoadingPipeline() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 80);
    return () => clearInterval(id);
  }, []);

  const stages = [
    { id: "search",  label: "Searching",  Icon: Search },
    { id: "read",    label: "Reading",    Icon: Book },
    { id: "compose", label: "Composing",  Icon: Sparkles },
  ];
  const stageIdx = elapsed < 900 ? 0 : elapsed < 1800 ? 1 : 2;

  return (
    <div className="flex gap-2.5 sm:gap-3 animate-fade-in">
      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-[oklch(0.58_0.22_27/0.3)] mt-0.5 animate-pulse-ring">
        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="flex items-center">
            {stages.map((s, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx;
              const { Icon } = s;
              return (
                <div key={s.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-400 ${
                      done   ? "bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-[oklch(0.58_0.22_27/0.3)]"
                      : active ? "border-2 border-[oklch(0.62_0.23_27)] bg-card shadow-[0_0_0_4px_oklch(0.62_0.23_27/0.12)]"
                      : "border-2 border-border bg-muted/50"
                    }`}>
                      {done
                        ? <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                        : <Icon className={`h-3.5 w-3.5 ${active ? "text-[oklch(0.58_0.22_27)] animate-pulse" : "text-muted-foreground/50"}`} strokeWidth={2} />
                      }
                    </div>
                    <span className={`text-[11px] font-medium ${active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className={`h-0.5 flex-1 mb-5 mx-1 transition-all duration-500 ${done ? "bg-gradient-to-r from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)]" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-center text-[12px] text-muted-foreground">
            {stages[stageIdx]?.id === "search" ? "Scanning knowledge sources…"
             : stages[stageIdx]?.id === "read" ? "Extracting relevant passages…"
             : "Generating your answer…"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Exchange Section ───────────────────────────────────────── */
function ExchangeSection({ exchange, streaming, isActive, durationMs }: {
  exchange: Exchange; streaming: boolean; isActive: boolean; durationMs?: number;
}) {
  const aiText = messageText(exchange.assistant);
  const showDone = !streaming && exchange.assistant && aiText.length > 0;
  return (
    <section id={exchange.id} data-active={isActive} className="scroll-mt-4 flex flex-col gap-6 sm:gap-7">
      {exchange.user && <Message message={exchange.user} />}
      {exchange.assistant && <Message message={exchange.assistant} streaming={streaming} />}
      {showDone && (
        <div className="flex items-center gap-2 -mt-3 sm:-mt-4 pl-10 sm:pl-11 animate-fade-in-up">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
          </div>
          <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            Answered
            {durationMs !== undefined && (
              <span className="text-muted-foreground font-normal"> · {formatDuration(durationMs)}</span>
            )}
          </span>
        </div>
      )}
    </section>
  );
}

/* ── Exchange Card (right sidebar, guest mode) ───────────────── */
function ExchangeCard({ exchange, index, active, onClick, streaming, busyHere, durationMs }: {
  exchange: Exchange; index: number; active: boolean; onClick: () => void;
  streaming: boolean; busyHere: boolean; durationMs?: number;
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
        className={`group w-full text-left rounded-xl border p-3 transition-all ${
          active
            ? "border-[oklch(0.62_0.23_27/0.4)] bg-[oklch(0.62_0.23_27/0.04)] dark:bg-[oklch(0.62_0.23_27/0.06)] shadow-sm"
            : "border-border bg-card/40 hover:border-border/80 hover:bg-card/70"
        }`}
      >
        <div className="flex items-start gap-2">
          <span className={`shrink-0 mt-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
            active ? "bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] text-white" : "bg-muted text-muted-foreground"
          }`}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-semibold leading-snug line-clamp-2 ${active ? "text-foreground" : "text-foreground/90"}`}>
              {userText || "…"}
            </p>
            {(aiText || isStreamingHere) && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                {aiText || <span className="animate-thinking-dots inline-flex">Composing<span>.</span><span>.</span><span>.</span></span>}
              </p>
            )}
            {sourceCount > 0 && isDone && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {sourceCount} sources
              </span>
            )}
          </div>
          {isDone && (
            <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="h-2.5 w-2.5 text-emerald-500" strokeWidth={3.5} />
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

/* ── Empty State ────────────────────────────────────────────── */
function EmptyState({ assistantName }: { assistantName?: string }) {
  const name = assistantName ?? "your assistant";
  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-6 px-2 py-8">
      <div className="text-center space-y-4 max-w-lg animate-fade-in-up">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] blur-xl opacity-40" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-xl shadow-[oklch(0.58_0.22_27/0.3)]">
            <MessageSquare className="h-6 w-6 text-white" strokeWidth={1.75} />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance leading-tight">
          Ask anything about{" "}
          <span className="bg-gradient-to-r from-[oklch(0.62_0.23_27)] to-[oklch(0.50_0.22_27)] bg-clip-text text-transparent">
            {name}
          </span>
        </h2>
        <p className="text-[15px] text-muted-foreground max-w-sm mx-auto text-balance leading-relaxed">
          I can answer questions grounded in the indexed content.
        </p>
      </div>
    </div>
  );
}

/* ── Composer ───────────────────────────────────────────────── */
interface ComposerProps {
  input: string; setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  busy: boolean; compact?: boolean; assistantName?: string;
}

function Composer({ input, setInput, onSubmit, onKeyDown, textareaRef, busy, compact = false, assistantName }: ComposerProps) {
  const placeholder = compact ? "Ask a follow-up…" : assistantName ? `Ask anything about ${assistantName}…` : "Ask anything…";
  return (
    <form onSubmit={onSubmit} className="shrink-0 group relative pb-[env(safe-area-inset-bottom)]">
      <div className={`relative flex items-end gap-2 rounded-[18px] border border-border bg-card/80 backdrop-blur-2xl transition-all focus-within:border-[oklch(0.62_0.23_27/0.5)] focus-within:shadow-[0_0_0_4px_oklch(0.62_0.23_27/0.08)] ${compact ? "px-2.5 py-2" : "px-3 py-2.5 sm:px-3.5 sm:py-3"} shadow-sm`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={busy}
          rows={1}
          className={`flex-1 resize-none bg-transparent px-1 py-1.5 text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-50 max-h-[180px] ${compact ? "text-[14px]" : "text-[15px] sm:text-base"}`}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send message"
          className={`shrink-0 inline-flex items-center justify-center rounded-xl text-white transition-all duration-200 enabled:hover:scale-[1.04] enabled:active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${compact ? "h-9 w-9" : "h-10 w-10"} ${
            input.trim() && !busy
              ? "bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-md shadow-[oklch(0.58_0.22_27/0.25)]"
              : "bg-muted"
          }`}
        >
          {busy ? <span className="block h-2 w-2 rounded-sm bg-white animate-pulse" /> : <ArrowUp className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={2.6} />}
        </button>
      </div>
      {!compact && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          Answers are grounded in indexed content · may contain inaccuracies
        </p>
      )}
    </form>
  );
}
