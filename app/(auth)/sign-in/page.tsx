'use client';

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/db/client";
import { ArrowRight, Sparkles, Mail, CheckCircle, Globe, Link, Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserSupabaseClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");

    const callback = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback },
    });

    setLoading(false);
    if (error) { setError(error.message); } else { setSent(true); }
  }

  return (
    <main className="relative flex min-h-dvh bg-background overflow-hidden">
      {/* SVG grid background */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05] dark:opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="fade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <mask id="m"><rect width="100%" height="100%" fill="url(#fade)" /></mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" mask="url(#m)" />
      </svg>

      {/* Floating orbs */}
      <div className="pointer-events-none absolute top-[15%] right-[8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.62_0.23_27/0.12)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[20%] left-[5%] h-48 w-48 rounded-full bg-[radial-gradient(circle,oklch(0.62_0.23_27/0.07)_0%,transparent_70%)]" />

      {/* ── Left brand panel (hidden on mobile) ─────────────────── */}
      <div className="relative hidden flex-1 flex-col justify-between p-12 md:flex lg:p-16">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-lg shadow-[oklch(0.58_0.22_27/0.35)]">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-foreground">
            Ask<span className="text-[oklch(0.58_0.22_27)]">Base</span>
          </span>
        </div>

        {/* Hero copy */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[oklch(0.62_0.23_27/0.2)] bg-[oklch(0.62_0.23_27/0.08)] px-3.5 py-1.5">
            <Zap className="h-3.5 w-3.5 text-[oklch(0.58_0.22_27)]" strokeWidth={2} />
            <span className="text-xs font-medium text-[oklch(0.58_0.22_27)]">Powered by AI + RAG</span>
          </div>
          <h1 className="mb-4 max-w-[480px] text-[clamp(28px,4vw,44px)] font-bold leading-[1.12] tracking-tight text-foreground">
            Build AI assistants<br />grounded in your content.
          </h1>
          <p className="max-w-[400px] text-base leading-relaxed text-muted-foreground">
            Index your docs, pages, and knowledge bases. Share a link. Let anyone ask questions answered by your content.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              { Icon: Globe,    text: "Index any public URL as a knowledge source" },
              { Icon: Sparkles, text: "AI answers grounded in your actual content" },
              { Icon: Link,     text: "Share a chat link — no account needed for readers" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[oklch(0.62_0.23_27/0.15)] bg-[oklch(0.62_0.23_27/0.08)]">
                  <Icon className="h-3.5 w-3.5 text-[oklch(0.58_0.22_27)]" strokeWidth={2} />
                </div>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">
          © 2025 AskBase ·{" "}
          <span className="cursor-pointer underline underline-offset-2 hover:text-muted-foreground transition-colors">Privacy</span>
          {" · "}
          <span className="cursor-pointer underline underline-offset-2 hover:text-muted-foreground transition-colors">Terms</span>
        </p>
      </div>

      {/* ── Right auth panel ─────────────────────────────────────── */}
      <div className="flex w-full flex-col items-center justify-center border-l border-border bg-card/80 px-8 py-10 backdrop-blur-2xl md:max-w-[480px]">
        <div className="w-full max-w-[360px]">
          {/* Mobile-only logo */}
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-lg shadow-[oklch(0.58_0.22_27/0.35)]">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-foreground">
              Ask<span className="text-[oklch(0.58_0.22_27)]">Base</span>
            </span>
          </div>

          {sent ? (
            /* Success state */
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
                <CheckCircle className="h-7 w-7 text-emerald-500" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Check your inbox</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We sent a magic link to
                </p>
                <p className="mt-1 text-[15px] font-semibold text-foreground">{email}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  Click the link in the email to sign in. The link expires in 15 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSent(false); setEmail(""); }}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[26px] font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="mt-2 mb-8 text-sm leading-relaxed text-muted-foreground">
                Sign in with your email — no password needed.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[13px] font-medium text-muted-foreground">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" strokeWidth={2} />
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-[oklch(0.62_0.23_27/0.6)] focus:ring-2 focus:ring-[oklch(0.62_0.23_27/0.15)]"
                    />
                  </div>
                  {error && (
                    <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] py-3 text-sm font-medium text-white shadow-md shadow-[oklch(0.58_0.22_27/0.25)] transition-all duration-200 enabled:hover:shadow-lg enabled:hover:shadow-[oklch(0.58_0.22_27/0.35)] enabled:hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>Send magic link <ArrowRight className="h-4 w-4" strokeWidth={2.4} /></>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground/60">or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Google SSO — placeholder */}
              <button
                type="button"
                disabled
                title="Google sign-in coming soon"
                className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-border bg-muted/40 py-2.5 text-sm text-muted-foreground/60 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground/60">
                By continuing you agree to our{" "}
                <span className="cursor-pointer text-muted-foreground underline underline-offset-2">Terms of Service</span>
                {" "}and{" "}
                <span className="cursor-pointer text-muted-foreground underline underline-offset-2">Privacy Policy</span>.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
