/**
 * @file Public-feed filter sidebar.
 *
 * Renders all filters as accessible HTML controls inside a single GET
 * form. The form's `action` is the current path so URL search params
 * are the source of truth (no client-side state). This works without
 * JavaScript and means every filtered view is shareable / bookmarkable.
 */

import Link from "next/link";
import { Pill } from "@/components/ui/pill";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
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
  return (
    <form
      action={basePath}
      method="get"
      className="space-y-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-auto pr-2"
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

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 h-10 rounded-md bg-[rgb(var(--color-accent))] text-[rgb(var(--color-on-accent))] text-sm font-medium hover:bg-[rgb(var(--color-accent-hover))]"
        >
          Apply
        </button>
        <Link
          href={basePath}
          className="flex-1 h-10 rounded-md border border-[rgb(var(--color-line-strong))] text-sm font-medium inline-flex items-center justify-center hover:bg-[rgb(var(--color-surface))]"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
