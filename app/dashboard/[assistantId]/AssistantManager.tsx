'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink, Copy, Check, Trash2, Plus, Loader2,
  Globe, AlertCircle, CheckCircle2, XCircle, Clock,
  Link as LinkIcon, RefreshCw, AlertTriangle, FileText, Book, Layers, Database, Settings2,
} from "lucide-react";

const CHUNK_OPTIONS = [
  { value: 10,  label: "Short article", desc: "~1–2 min read",  Icon: FileText },
  { value: 25,  label: "Full article",  desc: "~5 min read",    Icon: Book },
  { value: 50,  label: "Long doc",      desc: "~15 min read",   Icon: Layers },
  { value: 100, label: "Wiki page",     desc: "Dense content",  Icon: Globe },
  { value: 200, label: "Maximum",       desc: "Large PDFs",     Icon: Database },
] as const;

interface Source {
  id: string;
  url: string;
  title: string | null;
  status: string;
  chunk_count: number;
  ingested_at: string | null;
  created_at: string;
  error: string | null;
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

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ message, type, onDismiss }: { message: string; type: "success" | "warning" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const colors = {
    success: "text-emerald-700 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    warning: "text-amber-700 dark:text-amber-400 border-amber-500/20 bg-amber-500/5",
    error:   "text-red-600 dark:text-red-400 border-red-500/20 bg-red-500/5",
  };
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
      <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${colors[type]}`}>
        <AlertCircle className="mt-px h-4 w-4 shrink-0" />
        <span className="max-w-[320px]">{message}</span>
      </div>
    </div>
  );
}

/* ── Status Badge ───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    ready:      { icon: <CheckCircle2 className="h-3 w-3" />, label: "Ready",      cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    processing: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "Processing", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    pending:    { icon: <Clock className="h-3 w-3" />, label: "Pending",    cls: "text-muted-foreground bg-muted" },
    failed:     { icon: <XCircle className="h-3 w-3" />, label: "Failed",     cls: "text-red-500 bg-red-500/10" },
  };
  const { icon, label, cls } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

/* ── Source Card ────────────────────────────────────────────── */
function SourceCard({
  source,
  onDelete,
  onRetry,
  deleting,
  retrying,
}: {
  source: Source;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  deleting: boolean;
  retrying: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hostname = (() => { try { return new URL(source.url).hostname; } catch { return source.url; } })();

  const statusIcon = {
    ready:      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-emerald-500/10"><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>,
    processing: <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-amber-500/10"><Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400" /></div>,
    pending:    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-muted"><Clock className="h-4 w-4 text-muted-foreground" /></div>,
    failed:     <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /></div>,
  }[source.status] ?? <div className="h-8 w-8 shrink-0 rounded-[9px] bg-muted" />;

  return (
    <div className={`overflow-hidden rounded-xl border transition-all ${source.status === "failed" ? "border-red-500/20 bg-red-500/[0.02]" : "border-border bg-card/60"}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {statusIcon}

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[13px] font-medium text-foreground">{source.title ?? hostname}</p>
          <p className="truncate text-[11px] text-muted-foreground">{source.url}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {source.status === "ready" && (
            <span className="text-[12px] text-muted-foreground">{source.chunk_count} chunks</span>
          )}
          <StatusBadge status={source.status} />
          {source.status === "failed" && (
            <button
              type="button"
              onClick={() => onRetry(source.id)}
              disabled={retrying}
              aria-label="Retry"
              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" strokeWidth={2.4} />}
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
            aria-label="Delete source"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Error reason */}
      {source.status === "failed" && source.error && (
        <div className="flex items-center gap-2 border-t border-red-500/15 bg-red-500/[0.03] px-4 py-2">
          <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
          <span className="text-[12px] text-red-500/80 flex-1">{source.error}</span>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-2.5">
          <span className="flex-1 text-[13px] text-muted-foreground">Remove this source?</span>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDelete(source.id)}
            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-500/20 transition-colors"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function AssistantManager({ assistant, initialSources, shareUrl }: Props) {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "error" } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [retryingSourceId, setRetryingSourceId] = useState<string | null>(null);
  const [confirmDeleteAssistant, setConfirmDeleteAssistant] = useState(false);
  const [deletingAssistant, setDeletingAssistant] = useState(false);
  const [maxChunks, setMaxChunks] = useState(assistant.max_chunks_per_source ?? 50);
  const [savingChunks, setSavingChunks] = useState(false);

  const readyCount = sources.filter((s) => s.status === "ready").length;
  const failedCount = sources.filter((s) => s.status === "failed").length;
  const healthPct = sources.length > 0 ? Math.round((readyCount / sources.length) * 100) : 0;

  function showToast(message: string, type: "success" | "warning" | "error" = "success") {
    setToast({ message, type });
  }

  async function handleAddUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || adding) return;
    setAdding(true);
    setAddError("");

    const submittedUrl = url.trim();

    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistantId: assistant.id, url: submittedUrl }),
    });
    const json = await res.json();
    setAdding(false);

    const now = new Date().toISOString();

    if (!res.ok) {
      // Still show the failed source in the list so the user can see the error
      if (json.sourceId) {
        setSources((prev) => [{
          id: json.sourceId,
          url: submittedUrl,
          title: null,
          status: "failed",
          chunk_count: 0,
          ingested_at: null,
          created_at: now,
          error: json.error ?? "Failed to index",
        }, ...prev]);
      }
      setAddError(json.error ?? "Failed to add URL");
      return;
    }

    setUrl("");

    // Optimistically add the source — router.refresh() will backfill the title
    setSources((prev) => [{
      id: json.sourceId,
      url: submittedUrl,
      title: null,
      status: "ready",
      chunk_count: json.chunksUpserted ?? 0,
      ingested_at: now,
      created_at: now,
      error: null,
    }, ...prev]);

    router.refresh();

    if (json.chunksUpserted) {
      showToast(`Indexed ${json.chunksUpserted} chunk${json.chunksUpserted === 1 ? "" : "s"} — content is ready.`, "success");
    } else {
      showToast("Added, but no content could be extracted. JavaScript-rendered pages (SPAs) are not supported — try a static article or blog post URL.", "warning");
    }
  }

  async function handleDeleteSource(id: string) {
    setDeletingSourceId(id);
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    setDeletingSourceId(null);
  }

  async function handleRetrySource(id: string) {
    setRetryingSourceId(id);
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "processing", error: null } : s));

    const res = await fetch(`/api/sources/${id}/retry`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setRetryingSourceId(null);

    const now = new Date().toISOString();
    if (res.ok) {
      setSources((prev) => prev.map((s) => s.id === id ? {
        ...s,
        status: "ready",
        chunk_count: json.chunksUpserted ?? s.chunk_count,
        ingested_at: now,
        error: null,
      } : s));
      showToast(`Indexed ${json.chunksUpserted ?? 0} chunks`, "success");
      router.refresh();
    } else {
      setSources((prev) => prev.map((s) => s.id === id ? {
        ...s,
        status: "failed",
        error: json.error ?? "Retry failed",
      } : s));
      showToast(json.error ?? "Retry failed", "error");
    }
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

  return (
    <div className="space-y-7">

      {/* ── Share link ──────────────────────────────────────────── */}
      <section className="rounded-[18px] border border-border bg-card/60 backdrop-blur-sm p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-[oklch(0.58_0.22_27/0.25)]">
            <LinkIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-foreground">Share link</h3>
            <p className="text-xs text-muted-foreground">Anyone with this link can chat with your assistant</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Public
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-1 items-center overflow-hidden rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 font-mono text-[13px] text-muted-foreground">
            <span className="truncate">{shareUrl}</span>
          </div>
          <button
            type="button"
            onClick={copyShareLink}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              copied
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.2)] hover:-translate-y-px"
            }`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <Link
            href={`/a/${assistant.slug}`}
            target="_blank"
            className="flex shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* ── Sources ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Sources</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{sources.length}/10 URLs indexed</p>
          </div>
        </div>

        {/* Health bar (shown when there are sources) */}
        {sources.length > 0 && (
          <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{readyCount} ready</span>
                {failedCount > 0 && <span className="text-red-500"> · {failedCount} failed</span>}
                <span className="text-muted-foreground/70"> of {sources.length} sources</span>
              </span>
              <span className={`font-semibold ${healthPct === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {healthPct}%
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-border">
              {failedCount > 0 && (
                <div
                  className="absolute h-full bg-red-500/30"
                  style={{ left: `${healthPct}%`, width: `${(failedCount / sources.length) * 100}%` }}
                />
              )}
              <div
                className="h-full rounded-full bg-gradient-to-r from-[oklch(0.72_0.17_162)] to-[oklch(0.60_0.17_162)] transition-[width] duration-700"
                style={{ width: `${healthPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Add URL */}
        {sources.length < 10 && (
          <form onSubmit={handleAddUrl} className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" strokeWidth={2} />
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setAddError(""); }}
                placeholder="https://docs.example.com/page"
                required
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-[oklch(0.62_0.23_27/0.6)] focus:ring-2 focus:ring-[oklch(0.62_0.23_27/0.12)]"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !url.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-px"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.5} />}
              {adding ? "Indexing…" : "Add URL"}
            </button>
          </form>
        )}

        {addError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {addError}
          </div>
        )}

        {/* Source cards */}
        {sources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-14 text-center">
            <p className="text-sm text-muted-foreground">No sources yet. Add a URL above to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sources.map((s) => (
              <SourceCard
                key={s.id}
                source={s}
                onDelete={handleDeleteSource}
                onRetry={handleRetrySource}
                deleting={deletingSourceId === s.id}
                retrying={retryingSourceId === s.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Content depth ───────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <h2 className="text-[15px] font-semibold text-foreground">Content depth</h2>
          {savingChunks && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          How much content to extract per URL. Larger = richer answers, slower indexing. Applies to new URLs only.
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {CHUNK_OPTIONS.map(({ value, label, desc, Icon }) => {
            const selected = maxChunks === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleChunkLimitChange(value)}
                className={`flex flex-col items-center gap-2 rounded-[14px] border p-3.5 text-center transition-all ${
                  selected
                    ? "border-transparent bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] text-white shadow-md shadow-[oklch(0.58_0.22_27/0.3)] -translate-y-0.5"
                    : "border-border bg-card/50 text-foreground hover:border-border/80 hover:bg-card hover:-translate-y-0.5"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${selected ? "opacity-100" : "opacity-60"}`} strokeWidth={1.75} />
                <span className="text-[12px] font-semibold">{label}</span>
                <span className={`text-[11px] ${selected ? "opacity-80" : "opacity-60"}`}>{desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Danger zone ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Delete this assistant</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently removes the assistant and all its sources. Cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAssistant}
            disabled={deletingAssistant}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              confirmDeleteAssistant
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
            }`}
          >
            {deletingAssistant ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
            {confirmDeleteAssistant ? "Confirm delete" : "Delete assistant"}
          </button>
        </div>
      </section>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
