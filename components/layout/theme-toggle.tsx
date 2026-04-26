/**
 * @file Theme toggle button.
 *
 * Cycles light → dark → system. Renders an icon mid-state so server
 * and client agree on the initial markup (avoids hydration warning).
 */

"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ORDER = ["light", "dark", "system"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (theme ?? "system") : "system";
  const next = ORDER[(ORDER.indexOf(current as (typeof ORDER)[number]) + 1) % ORDER.length];

  return (
    <button
      aria-label={`Switch theme (currently ${current})`}
      className="h-9 w-9 inline-flex items-center justify-center rounded-md text-[rgb(var(--color-fg-muted))] hover:bg-[rgb(var(--color-surface))]"
      onClick={() => setTheme(next)}
      type="button"
    >
      {current === "light" ? <Sun size={18} /> : current === "dark" ? <Moon size={18} /> : <Monitor size={18} />}
    </button>
  );
}
