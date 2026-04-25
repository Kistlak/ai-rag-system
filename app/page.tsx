import Chat from "@/components/chat";

export default function Home() {
  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col px-4 py-6">
      <header className="mb-4 shrink-0">
        <h1 className="text-xl font-semibold">BBC News RAG</h1>
        <p className="text-sm text-muted-foreground">
          Ask anything about recent BBC reporting.
        </p>
      </header>
      <Chat />
    </main>
  );
}
