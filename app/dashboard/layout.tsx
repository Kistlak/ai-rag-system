import { createServerSupabaseClient } from "@/lib/db/server";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import DashboardHeader from "./DashboardHeader";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <DashboardHeader userInitial={userInitial} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
