import Chat from "@/components/chat";

export default function Home() {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 flex items-center gap-3 border-b border-border/40 px-6 py-3">
        <div className="flex items-center justify-center rounded bg-red-600 px-2 py-0.5 text-sm font-bold text-white tracking-widest">
          BBC
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">News Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Answers grounded in recent BBC reporting
          </p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-4xl w-full mx-auto px-4">
        <Chat />
      </div>
    </main>
  );
}
