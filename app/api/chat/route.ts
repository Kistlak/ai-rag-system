import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  isTextUIPart,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { retrieve, buildPrompt } from "@/lib/rag/retrieve";
import { getModel } from "@/lib/llm";

export const maxDuration = 30;

const FALLBACK =
  "I couldn't find anything in BBC coverage on that. Try rephrasing or asking about a different recent story.";
const FALLBACK_ID = "no-context";

const UIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()),
  metadata: z.unknown().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z
    .object({ messages: z.array(UIMessageSchema).min(1) })
    .safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const messages = parsed.data.messages as UIMessage[];
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return Response.json(
      { error: "Last message must be from user" },
      { status: 400 }
    );
  }

  const queryText = lastMessage.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

  if (!queryText.trim()) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  const chunks = await retrieve(queryText, 5);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (chunks.length === 0) {
        writer.write({ type: "text-start", id: FALLBACK_ID });
        writer.write({ type: "text-delta", id: FALLBACK_ID, delta: FALLBACK });
        writer.write({ type: "text-end", id: FALLBACK_ID });
        return;
      }

      const { system } = buildPrompt(queryText, chunks);

      const modelMessages = await convertToModelMessages(messages);
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
