'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Sparkles, ExternalLink, Trash2, ArrowRight,
  Loader2, Globe, Layers, Clock, Bot, Info, X,
} from "lucide-react";

interface Assistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

interface Props {
  assistants: Assistant[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-2.5 text-sm font-medium text-foreground shadow-xl backdrop-blur-xl animate-fade-in">
      <span className={`h-2 w-2 rounded-full ${type === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
      {message}
    </div>
  );
}

/* ── Create Modal ───────────────────────────────────────────── */
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-background p-7 shadow-2xl animate-fade-in-up">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">New assistant</h3>
          <button type="button" onClick={onClose} className="flex items-center justify-center rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-4.5 w-4.5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Company Docs, Support KB…"
              maxLength={80}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-[oklch(0.62_0.23_27/0.6)] focus:ring-2 focus:ring-[oklch(0.62_0.23_27/0.12)]"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Info callout */}
          <div className="flex gap-2.5 rounded-xl border border-[oklch(0.62_0.23_27/0.15)] bg-[oklch(0.62_0.23_27/0.05)] p-3.5">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-[oklch(0.58_0.22_27)]" strokeWidth={2} />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              You&apos;ll be able to add URL sources and configure settings after creating.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-px"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Creating…" : "Create assistant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Assistant Card ─────────────────────────────────────────── */
function AssistantCard({
  assistant,
  onDelete,
  deleting,
}: {
  assistant: Assistant;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-card/80 backdrop-blur-sm transition-all hover:border-border/80 hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5 dark:hover:shadow-black/20">
      {/* Top accent strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{assistant.name}</p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground/70">/a/{assistant.slug}</p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(assistant.id)}
            disabled={deleting}
            aria-label="Delete assistant"
            className="shrink-0 flex items-center justify-center p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
        </div>

        {assistant.description && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">{assistant.description}</p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3 text-muted-foreground/60" strokeWidth={2} />
            {relativeTime(assistant.created_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          <Link
            href={`/dashboard/${assistant.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] py-2 text-[13px] font-medium text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.2)] transition-all hover:-translate-y-px hover:shadow-md hover:shadow-[oklch(0.58_0.22_27/0.3)]"
          >
            Manage
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
          <Link
            href={`/a/${assistant.slug}`}
            target="_blank"
            aria-label="Open public chat"
            className="flex items-center justify-center rounded-xl border border-border bg-muted/40 px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-xl shadow-[oklch(0.58_0.22_27/0.3)]">
        <Bot className="h-9 w-9 text-white" strokeWidth={1.75} />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Build your first assistant</h2>
        <p className="text-sm leading-relaxed text-muted-foreground max-w-[360px]">
          Index your URLs, docs, or knowledge base. Share a link and let anyone ask questions grounded in your content.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {["Index URLs", "AI-powered answers", "Shareable link"].map((f) => (
          <span key={f} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            {f}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-[oklch(0.58_0.22_27/0.25)] transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-[oklch(0.58_0.22_27/0.35)]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Create your first assistant
      </button>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function AssistantGrid({ assistants: initial }: Props) {
  const router = useRouter();
  const [assistants, setAssistants] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function handleCreate(name: string) {
    const res = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create");
    setAssistants((prev) => [json.assistant, ...prev]);
    showToast(`"${name}" created successfully`);
    router.push(`/dashboard/${json.assistant.id}`);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/assistants/${id}`, { method: "DELETE" });
    setAssistants((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
    showToast("Assistant deleted");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Your assistants</h1>
          <p className="mt-1 text-sm text-muted-foreground">{assistants.length} assistant{assistants.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.2)] transition-all hover:-translate-y-px hover:shadow-md hover:shadow-[oklch(0.58_0.22_27/0.3)]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          New assistant
        </button>
      </div>

      {/* Grid or empty state */}
      {assistants.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assistants.map((a) => (
            <AssistantCard
              key={a.id}
              assistant={a}
              onDelete={handleDelete}
              deleting={deletingId === a.id}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
