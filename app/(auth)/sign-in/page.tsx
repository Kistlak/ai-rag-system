'use client';

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/db/client";
import { ArrowRight, Sparkles, Mail, CheckCircle } from "lucide-react";

export default function SignInPage() {
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

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-xl shadow-red-600/30">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">RAG Platform</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Paste a URL. Get a public chatbot.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 shadow-sm">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle className="h-5 w-5 text-emerald-500" strokeWidth={2} />
              </div>
              <div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a magic link to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="
                      w-full rounded-xl border border-border/60 bg-background
                      pl-9 pr-3 py-2.5 text-sm
                      placeholder:text-muted-foreground/60
                      outline-none focus:border-red-500/50
                      focus:ring-2 focus:ring-red-500/10
                      transition-all
                    "
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="
                  w-full flex items-center justify-center gap-2
                  rounded-xl py-2.5 text-sm font-medium text-white
                  bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)]
                  shadow-md shadow-red-600/25
                  transition-all duration-200
                  enabled:hover:shadow-lg enabled:hover:shadow-red-600/30 enabled:hover:scale-[1.01]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          No password needed. We&apos;ll email you a link to sign in.
        </p>
      </div>
    </main>
  );
}
