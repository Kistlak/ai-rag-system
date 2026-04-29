import Chat from "@/components/chat";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-lg shadow-red-600/25 ring-soft">
              <span className="text-[10px] font-black tracking-widest text-white">BBC</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                News Assistant
              </h1>
              <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground leading-tight mt-0.5">
                <span className="inline-block h-1 w-1 rounded-full bg-emerald-500" />
                Live · grounded in recent BBC NEWS reporting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Claude Sonnet
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden w-full">
        <div className="flex flex-1 max-w-4xl lg:max-w-[1400px] w-full mx-auto px-3 sm:px-4 lg:px-6">
          <Chat />
        </div>
      </div>
    </main>
  );
}
