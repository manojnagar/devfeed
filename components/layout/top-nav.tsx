/**
 * @file Application top navigation.
 *
 * Renders site title, primary nav, search box, theme toggle, and the
 * sign-in / account link. Auth state comes via the optional `session`
 * prop so the parent layout can resolve it server-side.
 */

import Link from "next/link";
import { Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthSession } from "@/lib/auth";

export interface TopNavProps {
  session: AuthSession | null;
}

export function TopNav({ session }: TopNavProps) {
  const isAdmin = session?.user.role === "admin";
  return (
    <header className="border-b border-[rgb(var(--color-line))] bg-[rgb(var(--color-bg))]/95 backdrop-blur sticky top-0 z-30">
      <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
        <Link
          href="/"
          className="font-bold text-base tracking-tight text-[rgb(var(--color-fg))] hover:text-[rgb(var(--color-accent))]"
        >
          DevFeed
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm text-[rgb(var(--color-fg-muted))]">
          <Link className="px-2 py-1 rounded hover:bg-[rgb(var(--color-surface))]" href="/">
            Feed
          </Link>
          <Link className="px-2 py-1 rounded hover:bg-[rgb(var(--color-surface))]" href="/publishers">
            Publishers
          </Link>
          <Link className="px-2 py-1 rounded hover:bg-[rgb(var(--color-surface))]" href="/tags">
            Tags
          </Link>
          <Link className="px-2 py-1 rounded hover:bg-[rgb(var(--color-surface))]" href="/suggest">
            Suggest
          </Link>
        </nav>
        <form action="/search" className="ml-auto flex-1 max-w-sm hidden sm:block">
          <label className="sr-only" htmlFor="topnav-search">
            Search
          </label>
          <div className="relative">
            <Search
              aria-hidden
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--color-fg-subtle))]"
            />
            <Input
              id="topnav-search"
              name="q"
              placeholder="Search posts, publishers, tags…"
              className="pl-8 h-9"
              type="search"
            />
          </div>
        </form>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {session ? (
            <AccountMenu
              displayName={session.user.displayName ?? session.user.email}
              email={session.user.email}
              isAdmin={isAdmin}
            />
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
