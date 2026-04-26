/**
 * @file Sidebar nav for /admin/* pages.
 *
 * Client component — uses `usePathname` for active highlighting.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Rss,
  Tag,
  Users,
  ShieldAlert,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin/overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/publishers", label: "Publishers", icon: <Newspaper size={16} /> },
  { href: "/admin/sources", label: "Sources", icon: <Rss size={16} /> },
  { href: "/admin/tags", label: "Tags", icon: <Tag size={16} /> },
  { href: "/admin/moderation", label: "Moderation", icon: <ShieldAlert size={16} /> },
  { href: "/admin/users", label: "Users", icon: <Users size={16} /> },
  { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 size={16} /> },
  { href: "/admin/audit", label: "Audit log", icon: <ClipboardList size={16} /> },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="space-y-0.5 text-sm">
      {ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
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
    </nav>
  );
}
