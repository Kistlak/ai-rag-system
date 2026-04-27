'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "./SignOutButton";

interface Props {
  userInitial: string;
}

const TABS = [
  { label: "Assistants", href: "/dashboard",          match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/") && !p.startsWith("/dashboard/usage") && !p.startsWith("/dashboard/settings") },
  { label: "Usage",      href: "/dashboard/usage",    match: (p: string) => p.startsWith("/dashboard/usage") },
  { label: "Settings",   href: "/dashboard/settings", match: (p: string) => p.startsWith("/dashboard/settings") },
] as const;

export default function DashboardHeader({ userInitial }: Props) {
  const pathname = usePathname();
  return (
    <header className="shrink-0 sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-[60px]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-sm shadow-[oklch(0.58_0.22_27/0.3)]">
            <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">
            Ask<span className="text-[oklch(0.58_0.22_27)]">Base</span>
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {TABS.map(({ label, href, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-1">
            <SignOutButton userInitial={userInitial} />
          </div>
        </div>
      </div>
    </header>
  );
}
