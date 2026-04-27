'use client';

import type { UIMessage, SourceUrlUIPart } from "ai";
import { isTextUIPart } from "ai";
import { Sparkles, ExternalLink, Newspaper, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  message: UIMessage;
  streaming?: boolean;
}

function parseSourceMeta(s: SourceUrlUIPart): { title: string; imageUrl: string | null } {
  try {
    const parsed = JSON.parse(s.title ?? "");
    if (parsed && typeof parsed === "object" && "t" in parsed) {
      return {
        title: String(parsed.t ?? ""),
        imageUrl: parsed.i ? String(parsed.i) : null,
      };
    }
  } catch {}
  return { title: s.title ?? s.url, imageUrl: null };
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "bbc.com";
  }
}

export default function Message({ message, streaming = false }: Props) {
  const [copied, setCopied] = useState(false);

  const text = message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

  const sources = message.parts.filter(
    (p): p is SourceUrlUIPart => p.type === "source-url"
  );

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="
          max-w-[85%] sm:max-w-[75%]
          rounded-3xl rounded-br-lg
          bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.50_0.22_27)]
          px-4 py-2.5
          text-[15px] text-white
          whitespace-pre-wrap
          shadow-md shadow-red-600/20 ring-soft
        ">
          {text}
        </div>
      </div>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  // Show typing caret on the assistant message that's currently streaming.
  const showCaret = streaming && text.length > 0;

  // Sources arrive on the wire BEFORE text starts streaming. Don't render the
  // source block until there's also some answer text, or the stream is done —
  // otherwise you see "sources only, then text appears above them" which reads
  // as a duplicate render against the searching skeleton.
  const showSources = sources.length > 0 && (text.length > 0 || !streaming);

  return (
    <div className="flex gap-2.5 sm:gap-3 animate-fade-in-up">
      <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-red-600/30 ring-soft mt-0.5">
        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3.5">
        {/* ── assistant text ── */}
        {text && (
          <div className={`text-[15px] leading-[1.65] text-foreground prose-sm max-w-none ${showCaret ? "typing-caret" : ""}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1.5 marker:text-muted-foreground/50">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 space-y-1.5 marker:text-muted-foreground/60 marker:font-medium">{children}</ol>,
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => <h1 className="text-lg font-semibold tracking-tight mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold tracking-tight mt-4 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold tracking-tight mt-3 mb-1">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-l-2 border-red-500/50 pl-3.5 text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono">{children}</code>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-500 dark:text-red-400 hover:underline underline-offset-2 decoration-red-500/40"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-4 border-border/50" />,
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}

        {/* ── source cards ── */}
        {showSources && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <Newspaper className="h-3 w-3" strokeWidth={2.4} />
                <span>Sources</span>
                <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-bold text-foreground tabular-nums">
                  {sources.length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sources.map((s, i) => {
                const { title, imageUrl } = parseSourceMeta(s);
                return (
                  <a
                    key={s.sourceId}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      group relative flex flex-col overflow-hidden rounded-2xl
                      border border-border/50 bg-card/50 backdrop-blur-sm
                      ring-soft
                      transition-all duration-300
                      hover:border-border hover:bg-card
                      hover:-translate-y-1
                      hover:shadow-xl hover:shadow-black/[0.06]
                      dark:hover:shadow-black/40
                    "
                  >
                    {imageUrl ? (
                      <div className="aspect-video overflow-hidden bg-muted shrink-0 relative">
                        <img
                          src={imageUrl}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2.5 left-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 backdrop-blur-md px-1.5 text-[10px] font-bold text-white tabular-nums ring-1 ring-white/10">
                          {i + 1}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-muted via-muted/60 to-muted/20 flex items-center justify-center relative">
                        <Newspaper className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                        <div className="absolute top-2.5 left-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 backdrop-blur-md px-1.5 text-[10px] font-bold text-white tabular-nums ring-1 ring-white/10">
                          {i + 1}
                        </div>
                      </div>
                    )}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <p className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground text-pretty">
                        {title}
                      </p>
                      <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                        <span className="truncate">{hostname(s.url)}</span>
                        <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* ── action row (only when finished and there is text) ── */}
        {text && !streaming && (
          <div className="flex items-center gap-1 -mt-1">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy answer"
              className="
                inline-flex items-center gap-1.5 rounded-lg
                px-2 py-1 text-[11px] font-medium text-muted-foreground
                transition-all hover:bg-muted hover:text-foreground
              "
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.6} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" strokeWidth={2.2} />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
