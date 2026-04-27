'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles, ExternalLink, Trash2, ArrowRight, Loader2 } from "lucide-react";

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
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function AssistantGrid({ assistants: initial }: Props) {
  const router = useRouter();
  const [assistants, setAssistants] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(json.error ?? "Failed to create");
      return;
    }

    setAssistants((prev) => [json.assistant, ...prev]);
    setName("");
    setShowCreate(false);
    router.push(`/dashboard/${json.assistant.id}`);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/assistants/${id}`, { method: "DELETE" });
    setAssistants((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  if (assistants.length === 0 && !showCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-xl shadow-red-600/25">
          <Sparkles className="h-7 w-7 text-white" strokeWidth={2} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">No assistants yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Paste any URL and get a public AI chatbot grounded in that content.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create your first assistant
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your Assistants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{assistants.length} assistant{assistants.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm font-medium hover:bg-card hover:border-border transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          New assistant
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-red-500/30 bg-card/60 backdrop-blur-xl p-5 space-y-3 shadow-sm"
        >
          <p className="text-sm font-medium">Name your assistant</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Company Docs"
              maxLength={80}
              className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateError(""); setName(""); }}
              className="rounded-xl border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {assistants.map((a) => (
          <div
            key={a.id}
            className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 gap-3 hover:border-border hover:bg-card transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[15px] leading-snug truncate">{a.name}</p>
                <p className="text-[12px] text-muted-foreground truncate mt-0.5">/a/{a.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                disabled={deletingId === a.id}
                aria-label="Delete assistant"
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                {deletingId === a.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                }
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground/70">Created {relativeTime(a.created_at)}</p>

            <div className="flex items-center gap-2 mt-auto">
              <Link
                href={`/dashboard/${a.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 py-1.5 text-[13px] font-medium hover:bg-muted transition-all"
              >
                Manage
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
              </Link>
              <Link
                href={`/a/${a.slug}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[13px] text-muted-foreground hover:bg-muted transition-all"
                aria-label="Open public chat"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
