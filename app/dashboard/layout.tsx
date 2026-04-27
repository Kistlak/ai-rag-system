import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "./SignOutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="shrink-0 sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-red-600/25">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">RAG Platform</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
