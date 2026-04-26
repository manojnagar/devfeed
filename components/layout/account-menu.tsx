/**
 * @file AccountMenu — avatar dropdown shown in the top nav.
 *
 * Replaces the previous icon-only "Settings" link. Surfaces every
 * `/me/*` destination plus a clearly-labeled Sign out button so users
 * never have to dig into Account settings just to sign out.
 *
 * Accessibility:
 *   - Trigger uses `aria-haspopup="menu"` + `aria-expanded`.
 *   - Menu uses `role="menu"`, items use `role="menuitem"`.
 *   - Esc closes, click-outside closes, focus returns to the trigger.
 *   - Visible focus ring on every interactive element.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  ChevronDown,
  Inbox,
  LogOut,
  Newspaper,
  ShieldCheck,
  Tag,
  User,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/app/(public)/login/actions";

export interface AccountMenuProps {
  displayName: string;
  email: string;
  isAdmin: boolean;
}

interface MenuLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const PRIMARY_LINKS: MenuLink[] = [
  { href: "/me/digest", label: "Digest preferences", icon: <Bell size={16} /> },
  { href: "/me/bookmarks", label: "Bookmarks", icon: <Bookmark size={16} /> },
  { href: "/me/followed-publishers", label: "Followed publishers", icon: <Newspaper size={16} /> },
  { href: "/me/followed-tags", label: "Followed tags", icon: <Tag size={16} /> },
  { href: "/me/suggestions", label: "My suggestions", icon: <Inbox size={16} /> },
  { href: "/me/account", label: "Account settings", icon: <User size={16} /> },
];

export function AccountMenu({ displayName, email, isAdmin }: AccountMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // Close on outside click or Escape.
  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(t) &&
        triggerRef.current &&
        !triggerRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-9 inline-flex items-center gap-1.5 pl-1 pr-2 rounded-full border border-transparent",
          "hover:bg-[rgb(var(--color-surface))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))]",
          open && "bg-[rgb(var(--color-surface))]",
        )}
      >
        <Avatar name={displayName || email} size={28} rounded="full" />
        <ChevronDown size={14} aria-hidden className="text-[rgb(var(--color-fg-muted))]" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Account"
          className={cn(
            "absolute right-0 mt-2 w-64 rounded-lg border border-[rgb(var(--color-line))]",
            "bg-[rgb(var(--color-surface-elevated))] shadow-lg p-1 text-sm z-50",
          )}
        >
          <div className="px-3 py-2 border-b border-[rgb(var(--color-line))]">
            <p className="font-medium truncate text-[rgb(var(--color-fg))]">{displayName || email}</p>
            <p className="text-xs text-[rgb(var(--color-fg-muted))] truncate">{email}</p>
          </div>

          <ul className="py-1">
            {PRIMARY_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  role="menuitem"
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-[rgb(var(--color-fg))]",
                    "hover:bg-[rgb(var(--color-surface))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))]",
                  )}
                >
                  <span className="text-[rgb(var(--color-fg-muted))]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
            {isAdmin ? (
              <li>
                <Link
                  role="menuitem"
                  href="/admin/overview"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-[rgb(var(--color-warning))]",
                    "hover:bg-[rgb(var(--color-surface))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))]",
                  )}
                >
                  <ShieldCheck size={16} />
                  <span>Admin console</span>
                </Link>
              </li>
            ) : null}
          </ul>

          <div className="border-t border-[rgb(var(--color-line))] pt-1">
            <form action={signOutAction}>
              <button
                role="menuitem"
                type="submit"
                onClick={() => setOpen(false)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-[rgb(var(--color-danger))]",
                  "hover:bg-[rgb(var(--color-surface))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))]",
                )}
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
