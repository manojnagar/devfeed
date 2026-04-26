/**
 * @file Sidebar nav for /me/* pages.
 *
 * Client component — uses `usePathname` so the active item highlight
 * stays in sync with client-side navigations. Renders a "Sign out"
 * action at the bottom so users always have a one-click exit even if
 * they don't notice the avatar dropdown.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Inbox,
  LogOut,
  Newspaper,
  Tag,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/app/(public)/login/actions";

const ITEMS: Array<{ href: string; label: string; icon: React.ReactNode }> = [
  { href: "/me/digest", label: "Digest preferences", icon: <Bell size={16} /> },
  { href: "/me/bookmarks", label: "Bookmarks", icon: <Bookmark size={16} /> },
  { href: "/me/followed-publishers", label: "Followed publishers", icon: <Newspaper size={16} /> },
  { href: "/me/followed-tags", label: "Followed tags", icon: <Tag size={16} /> },
  { href: "/me/suggestions", label: "My suggestions", icon: <Inbox size={16} /> },
  { href: "/me/account", label: "Account", icon: <User size={16} /> },
];

export function SettingsSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="space-y-0.5 text-sm" aria-label="Account navigation">
      {ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgb(var(--color-surface))]",
              isActive
                ? "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-accent))] font-medium"
                : "text-[rgb(var(--color-fg-muted))]",
            )}
          >
            <span className="text-current">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div className="pt-2 mt-2 border-t border-[rgb(var(--color-line))]">
        <form action={signOutAction}>
          <button
            type="submit"
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-[rgb(var(--color-danger))]",
              "hover:bg-[rgb(var(--color-surface))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))]",
            )}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
