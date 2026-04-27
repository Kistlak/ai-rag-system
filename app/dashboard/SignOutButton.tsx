'use client';

import { createBrowserSupabaseClient } from "@/lib/db/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

interface Props {
  userInitial?: string;
}

export default function SignOutButton({ userInitial = "?" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] text-[13px] font-bold text-white shadow-sm shadow-[oklch(0.58_0.22_27/0.3)] transition-all hover:shadow-md hover:shadow-[oklch(0.58_0.22_27/0.4)] select-none"
        aria-label="User menu"
      >
        {userInitial}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-20 min-w-[140px] rounded-xl border border-border bg-card/95 p-1 shadow-lg shadow-black/10 backdrop-blur-xl">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
