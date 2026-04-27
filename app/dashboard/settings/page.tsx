import { createServerSupabaseClient } from "@/lib/db/server";
import { redirect } from "next/navigation";
import { Mail, Palette } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import SettingsSignOut from "./SettingsSignOut";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const created = user.created_at ? new Date(user.created_at).toLocaleDateString() : "—";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account and preferences.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card/40 divide-y divide-border">
        <Row Icon={Mail} label="Email" value={user.email ?? "—"} />
        <Row Icon={Mail} label="Member since" value={created} />
        <div className="flex items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <span className="text-[13px] font-medium text-muted-foreground">Theme</span>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-5">
        <h2 className="text-[14px] font-semibold text-red-600 dark:text-red-400">Sign out</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">End your session on this device.</p>
        <div className="mt-3">
          <SettingsSignOut />
        </div>
      </section>
    </div>
  );
}

function Row({ Icon, label, value }: { Icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="truncate text-[13px] text-foreground">{value}</span>
    </div>
  );
}
