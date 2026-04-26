/**
 * @file Theme provider — wraps next-themes for system / light / dark.
 *
 * Using `attribute="data-theme"` matches the CSS-token selectors in
 * `app/globals.css` (`:root[data-theme="dark"] { ... }`).
 */

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}
