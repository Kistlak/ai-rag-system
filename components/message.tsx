'use client';

import type { UIMessage, SourceUrlUIPart } from "ai";
import { isTextUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";

interface Props {
  message: UIMessage;
}

export default function Message({ message }: Props) {
  const text = message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

  const sources = message.parts.filter(
    (p): p is SourceUrlUIPart => p.type === "source-url"
  );

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-2 text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[90%] rounded-2xl border bg-white px-4 py-3 text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children }) => (
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">{children}</code>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {sources.length > 0 && (
        <Card className="max-w-[90%] p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sources
          </p>
          <ol className="flex flex-col gap-1">
            {sources.map((s, i) => (
              <li key={s.sourceId} className="flex items-start gap-1.5 text-xs">
                <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
