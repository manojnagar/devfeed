/**
 * @file Public-feed filter sidebar.
 *
 * Renders all filters as accessible HTML controls inside a single GET
 * form. The form's `action` is the current path so URL search params
 * remain the source of truth (no local state) — every filtered view
 * stays shareable and bookmarkable.
 *
 * Filters auto-apply: any checkbox / radio change triggers a soft
 * client-side navigation via `router.push`, wrapped in `useTransition`
 * so React keeps the prior UI visible until the new feed is ready.
 * The form still degrades to a plain GET submit if JS is disabled
 * (the hidden submit button is what gives screen-reader users the
 * "submit on Enter" affordance — visually we no longer need it).
 *
 * The `key={formKey}` on the form forces a remount whenever the URL
 * changes (Back/Forward, Reset, deep link), so `defaultChecked` is
 * always re-evaluated from the new `selected` props.
 */

"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui/pill";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Publisher, Tag } from "@/lib/types";

export interface FilterSidebarProps {
  publishers: Publisher[];
  featuredTags: Tag[];
  selected: {
    type: string[];
    publisher: string[];
    tag: string[];
    access: string[];
    from: string | null;
    q?: string;
  };
  basePath: string;
}

const TYPE_OPTIONS: Array<{ value: "company" | "person"; label: string }> = [
  { value: "company", label: "Companies" },
  { value: "person", label: "People" },
];
const ACCESS_OPTIONS: Array<{ value: "free" | "paid"; label: string }> = [
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];
const TIME_OPTIONS = [
  { value: "", label: "All time" },
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
];

function isoSinceLabel(label: string): string {
  if (label === "7d") return new Date(Date.now() - 7 * 86_400_000).toISOString();
  if (label === "30d") return new Date(Date.now() - 30 * 86_400_000).toISOString();
  return "";
}

export function FilterSidebar({
  publishers,
  featuredTags,
  selected,
  basePath,
}: FilterSidebarProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // Forces a form remount whenever the URL changes (Back/Forward, Reset
  // link click, external deep link) so each input's `defaultChecked` is
  // re-evaluated from the new `selected` prop. Without this, after
  // Back/Forward the URL would say one thing and the checkboxes another.
  const formKey = [
    selected.type.join(","),
    selected.publisher.join(","),
    selected.tag.join(","),
    selected.access.join(","),
    selected.from ?? "",
    selected.q ?? "",
  ].join("|");

  function applyFilters(): void {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      const v = String(value);
      // Skip the empty-string radio (e.g. "All time") so we don't
      // pollute the URL with `?from=` and confuse downstream parsers.
      if (v === "") continue;
      params.append(key, v);
    }
    const query = params.toString();
    const href = query ? `${basePath}?${query}` : basePath;
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  return (
    <form
      key={formKey}
      ref={formRef}
      action={basePath}
      method="get"
      onChange={applyFilters}
      onSubmit={(event) => {
        // Intercept the native submit so we use a soft client-side
        // navigation instead of a full page reload. Without JS this
        // handler never runs and the browser does the GET submit.
        event.preventDefault();
        applyFilters();
      }}
      aria-busy={isPending}
      className={cn(
        "sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-auto pr-2 transition-opacity",
        isPending && "opacity-60",
      )}
    >
      {selected.q ? <input type="hidden" name="q" value={selected.q} /> : null}
      <Card>
        <CardBody>
          <CardTitle className="mb-2 text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
            Source type
          </CardTitle>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="type"
                  value={opt.value}
                  defaultChecked={selected.type.includes(opt.value)}
                  className="sr-only peer"
                />
                <Pill
                  tone={opt.value === "person" ? "type-person" : "type-company"}
                  size="md"
                  className="peer-checked:bg-[rgb(var(--color-accent))]/15"
                >
                  {opt.label}
                </Pill>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle className="mb-2 text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
            Publishers
          </CardTitle>
          <ul className="max-h-56 overflow-y-auto space-y-1 text-sm">
            {publishers.slice(0, 30).map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="publisher"
                    value={p.slug}
                    defaultChecked={selected.publisher.includes(p.slug)}
                    className="accent-[rgb(var(--color-accent))]"
                  />
                  <span className="truncate">{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle className="mb-2 text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
            Featured tags
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {featuredTags.map((t) => (
              <label key={t.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="tag"
                  value={t.slug}
                  defaultChecked={selected.tag.includes(t.slug)}
                  className="sr-only peer"
                />
                <Pill
                  tone="neutral"
                  size="sm"
                  className="peer-checked:border-[rgb(var(--color-accent))] peer-checked:text-[rgb(var(--color-accent))]"
                >
                  #{t.slug}
                </Pill>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <CardTitle className="mb-2 text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
              Access
            </CardTitle>
            <div className="flex gap-3 text-sm">
              {ACCESS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="access"
                    value={opt.value}
                    defaultChecked={selected.access.includes(opt.value)}
                    className="accent-[rgb(var(--color-accent))]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <CardTitle className="mb-2 text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
              Time range
            </CardTitle>
            <div className="space-y-1.5 text-sm">
              {TIME_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="from"
                    value={opt.value ? isoSinceLabel(opt.value) : ""}
                    defaultChecked={
                      opt.value === ""
                        ? !selected.from
                        : selected.from === isoSinceLabel(opt.value)
                    }
                    className="accent-[rgb(var(--color-accent))]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Visually hidden submit so screen readers + no-JS clients can
          still trigger the GET form via Enter. With JS enabled, filters
          auto-apply on input change and this is never clicked. */}
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
        Apply filters
      </button>
      <div className="flex gap-2">
        <Link
          href={basePath}
          className={buttonClassName({ variant: "secondary", className: "flex-1" })}
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
