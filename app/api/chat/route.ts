import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  isTextUIPart,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import { z } from "zod";
import { retrieve, buildPrompt } from "@/lib/rag/retrieve";
import { getModel } from "@/lib/llm";
import { createAdminSupabaseClient } from "@/lib/db/server";

export const maxDuration = 30;

const FALLBACK = "I couldn't find anything relevant on that. Try rephrasing or asking about a different topic.";
const FALLBACK_ID = "no-context";

// ── In-memory rate limiter (20 req / 60s per assistant+IP) ──────────────────
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const WINDOW = 60_000;
  const MAX = 20;
  const times = (rateLimitMap.get(key) ?? []).filter((t) => now - t < WINDOW);
  if (times.length >= MAX) return true;
  times.push(now);
  rateLimitMap.set(key, times);
  return false;
}

// ── Schema ───────────────────────────────────────────────────────────────────
const UIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()),
  metadata: z.unknown().optional(),
});

const BodySchema = z.object({
  messages: z.array(UIMessageSchema).min(1),
  assistantId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  // Rate limit check
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, assistantId } = parsed.data;
  const rateLimitKey = `${assistantId ?? "default"}:${ip}`;

  if (isRateLimited(rateLimitKey)) {
    return Response.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const uiMessages = messages as UIMessage[];
  const lastMessage = uiMessages[uiMessages.length - 1];
  if (lastMessage.role !== "user") {
    return Response.json({ error: "Last message must be from user" }, { status: 400 });
  }

  const queryText = lastMessage.parts.filter(isTextUIPart).map((p) => p.text).join("");
  if (!queryText.trim()) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  // Resolve namespace + system prompt from assistantId if provided
  let namespace: string | undefined;
  let systemPromptOverride: string | null | undefined;

  if (assistantId) {
    const admin = createAdminSupabaseClient();
    const { data: assistant } = await admin
      .from("assistants")
      .select("pinecone_namespace, system_prompt, is_public")
      .eq("id", assistantId)
      .eq("is_public", true)
      .single();

    if (!assistant) {
      return Response.json({ error: "Assistant not found" }, { status: 404 });
    }

    namespace = assistant.pinecone_namespace;
    systemPromptOverride = assistant.system_prompt;
  }

  const chunks = await retrieve(queryText, 5, namespace);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (chunks.length === 0) {
        writer.write({ type: "text-start", id: FALLBACK_ID });
        writer.write({ type: "text-delta", id: FALLBACK_ID, delta: FALLBACK });
        writer.write({ type: "text-end", id: FALLBACK_ID });
        return;
      }

      const { system } = buildPrompt(queryText, chunks, systemPromptOverride);
      const modelMessages = await convertToModelMessages(uiMessages);

      const result = streamText({
        model: getModel(),
        system,
        messages: modelMessages,
      });

      chunks.forEach((chunk, i) => {
        writer.write({
          type: "source-url",
          sourceId: `source-${i}`,
          url: chunk.articleUrl,
          title: JSON.stringify({ t: chunk.title, i: chunk.imageUrl ?? "" }),
        });
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
