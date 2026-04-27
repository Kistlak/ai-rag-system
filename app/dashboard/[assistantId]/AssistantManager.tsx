'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink, Copy, Check, Trash2, Plus, Loader2,
  Globe, AlertCircle, Clock, CheckCircle2, XCircle, Settings2,
} from "lucide-react";

const CHUNK_OPTIONS = [
  { value: 10,  label: "10 chunks",          hint: "~6k words — short article" },
  { value: 25,  label: "25 chunks",          hint: "~15k words — medium page" },
  { value: 50,  label: "50 chunks",          hint: "~30k words — long page (default)" },
  { value: 100, label: "100 chunks",         hint: "~60k words — docs / wiki" },
  { value: 200, label: "All (200 max)",      hint: "~120k words — full crawl" },
] as const;

interface Source {
  id: string;
  url: string;
  title: string | null;
  status: string;
  chunk_count: number;
  ingested_at: string | null;
  created_at: string;
}

interface Assistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  max_chunks_per_source: number;
}

interface Props {
  assistant: Assistant;
  initialSources: Source[];
  shareUrl: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    ready:      { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Ready",      className: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: "Processing", className: "text-blue-500 bg-blue-500/10" },
    pending:    { icon: <Clock className="h-3.5 w-3.5" />,         label: "Pending",    className: "text-muted-foreground bg-muted" },
    failed:     { icon: <XCircle className="h-3.5 w-3.5" />,       label: "Failed",     className: "text-red-500 bg-red-500/10" },
  };
  const { icon, label, className } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {icon}{label}
    </span>
  );
}

export default function AssistantManager({ assistant, initialSources, shareUrl }: Props) {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [copied, setCopied] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [confirmDeleteAssistant, setConfirmDeleteAssistant] = useState(false);
  const [deletingAssistant, setDeletingAssistant] = useState(false);
  const [maxChunks, setMaxChunks] = useState(assistant.max_chunks_per_source ?? 50);
  const [savingChunks, setSavingChunks] = useState(false);

  async function handleAddUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || adding) return;
    setAdding(true);
    setAddError("");

    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistantId: assistant.id, url: url.trim() }),
    });
    const json = await res.json();
    setAdding(false);

    if (!res.ok) {
      setAddError(json.error ?? "Failed to add URL");
      return;
    }

    setUrl("");
    router.refresh(); // Re-fetch server component data
  }

  async function handleDeleteSource(id: string) {
    setDeletingSourceId(id);
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDeletingSourceId(null);
  }

  async function handleChunkLimitChange(value: number) {
    setMaxChunks(value);
    setSavingChunks(true);
    await fetch(`/api/assistants/${assistant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_chunks_per_source: value }),
    });
    setSavingChunks(false);
  }

  async function handleDeleteAssistant() {
    if (!confirmDeleteAssistant) {
      setConfirmDeleteAssistant(true);
      setTimeout(() => setConfirmDeleteAssistant(false), 4000);
      return;
    }
    setDeletingAssistant(true);
    await fetch(`/api/assistants/${assistant.id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const sourceCount = sources.length;
  const maxSources = 10;

  return (
    <div className="space-y-8">
      {/* Share link */}
      <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <h2 className="text-sm font-semibold">Public chat URL</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground truncate font-mono">
            {shareUrl}
          </div>
          <button
            type="button"
            onClick={copyShareLink}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-muted transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <Link
            href={`/a/${assistant.slug}`}
            target="_blank"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-muted transition-all text-muted-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            Open
          </Link>
        </div>
      </section>

      {/* Sources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Sources</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{sourceCount}/{maxSources} URLs</p>
          </div>
        </div>

        {/* Add URL form */}
        {sourceCount < maxSources && (
          <form onSubmit={handleAddUrl} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
              required
              className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all"
            />
            <button
              type="submit"
              disabled={adding || !url.trim()}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-white bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-600/20 transition-all"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
              {adding ? "Ingesting…" : "Add URL"}
            </button>
          </form>
        )}

        {addError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {addError}
          </div>
        )}

        {sourceCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 py-12 text-center">
            <p className="text-sm text-muted-foreground">No sources yet. Add a URL above to get started.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">URL / Title</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Chunks</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sources.map((s) => (
                  <tr key={s.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 min-w-0">
                      <p className="font-medium text-[13px] leading-snug truncate max-w-[280px]">
                        {s.title ?? s.url}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[280px] mt-0.5">
                        {s.url}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">
                      {s.status === "ready" ? s.chunk_count : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(s.id)}
                        disabled={deletingSourceId === s.id}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        aria-label="Delete source"
                      >
                        {deletingSourceId === s.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <h2 className="text-sm font-semibold">Ingestion settings</h2>
          {savingChunks && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Chunks per URL
          </label>
          <p className="text-xs text-muted-foreground">
            Controls how much of each page is indexed. More chunks = deeper coverage but slower ingest and higher cost.
            Applies to new URLs — existing sources are not re-ingested.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
            {CHUNK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChunkLimitChange(opt.value)}
                className={`
                  flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all
                  ${maxChunks === opt.value
                    ? "border-red-500/40 bg-red-500/[0.04] dark:bg-red-500/[0.06] shadow-sm"
                    : "border-border/50 bg-card/40 hover:border-border hover:bg-card/70"
                  }
                `}
              >
                <span className={`text-[13px] font-semibold ${maxChunks === opt.value ? "text-foreground" : "text-foreground/80"}`}>
                  {opt.label}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {opt.hint}
                </span>
                {maxChunks === opt.value && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                    <Check className="h-3 w-3" strokeWidth={3} /> Selected
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Delete this assistant</p>
            <p className="text-xs text-muted-foreground mt-0.5">Removes the assistant and all its sources. This cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAssistant}
            disabled={deletingAssistant}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all
              ${confirmDeleteAssistant
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
              } disabled:opacity-50`}
          >
            {deletingAssistant
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            }
            {confirmDeleteAssistant ? "Confirm delete" : "Delete assistant"}
          </button>
        </div>
      </section>
    </div>
  );
}
