'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface Props {
  assistantId: string;
  initialName: string;
}

export default function AssistantNameEditor({ assistantId, initialName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setName(initialName);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError("");
    setName(initialName);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName || saving) {
      cancel();
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/assistants/${assistantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to save");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2.5">
        <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{initialName}</h1>
        <button
          type="button"
          onClick={startEdit}
          aria-label="Rename assistant"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
        onKeyDown={onKeyDown}
        maxLength={80}
        disabled={saving}
        className="flex-1 min-w-0 max-w-[400px] rounded-lg border border-border bg-background px-3 py-1.5 text-xl font-bold tracking-tight text-foreground outline-none focus:border-[oklch(0.62_0.23_27/0.6)] focus:ring-2 focus:ring-[oklch(0.62_0.23_27/0.12)]"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || !name.trim()}
        aria-label="Save"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        aria-label="Cancel"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
      {error && <span className="text-[12px] text-red-500 ml-2">{error}</span>}
    </div>
  );
}
