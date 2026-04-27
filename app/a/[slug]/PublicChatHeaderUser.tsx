'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, History } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/db/client";
import type { ChatUser } from "@/components/chat";

interface Props {
  viewer: ChatUser | null;
  slug: string;
}

export default function PublicChatHeaderUser({ viewer, slug }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!viewer) {
    const next = encodeURIComponent(`/a/${slug}`);
    return (
      <a
        href={`/sign-in?next=${next}`}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-[12px] font-medium text-foreground transition-all hover:bg-card hover:-translate-y-px"
      >
        <History className="h-3.5 w-3.5" strokeWidth={2} />
        Sign in
      </a>
    );
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] text-[12px] font-semibold text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.25)] hover:-translate-y-px transition-all"
      >
        {viewer.initial}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[220px] rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-fade-in">
          <div className="px-3.5 py-2.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signed in as</p>
            <p className="mt-0.5 truncate text-[12px] text-foreground">{viewer.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13px] text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
