'use client';

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by reserving space until mounted
  if (!mounted) {
    return <div aria-hidden className="h-9 w-9 rounded-full" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/60 transition-all hover:bg-muted hover:border-border/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.62_0.23_27)]/40"
    >
      <Sun
        className="absolute h-4 w-4 text-amber-500 transition-all duration-300 rotate-0 scale-100 dark:-rotate-90 dark:scale-0"
        strokeWidth={2.2}
      />
      <Moon
        className="absolute h-4 w-4 text-indigo-300 transition-all duration-300 rotate-90 scale-0 dark:rotate-0 dark:scale-100"
        strokeWidth={2.2}
      />
    </button>
  );
}
