import Chat from "@/components/chat";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/40 backdrop-blur-md bg-background/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center rounded-md bg-gradient-to-br from-red-600 to-red-700 px-2 py-1 text-xs font-bold text-white tracking-widest shadow-sm shadow-red-600/30">
              BBC
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight truncate">
                News Assistant
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground leading-tight">
                Answers grounded in recent BBC reporting
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-4xl w-full mx-auto px-3 sm:px-6">
        <Chat />
      </div>
    </main>
  );
}
