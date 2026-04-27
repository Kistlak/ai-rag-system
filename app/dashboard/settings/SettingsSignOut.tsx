'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/db/client";

export default function SettingsSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handle() {
    setSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={signingOut}
      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
    >
      {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" strokeWidth={2} />}
      Sign out
    </button>
  );
}
