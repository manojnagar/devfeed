/**
 * @file Tags index — every tag in the catalog.
 */

import Link from "next/link";
import { getRepository } from "@/lib/data";
import { Pill } from "@/components/ui/pill";

export const dynamic = "force-dynamic";

export default async function TagsIndex() {
  const tags = await getRepository().tags.list();
  const featured = tags.filter((t) => t.isFeatured);
  const rest = tags.filter((t) => !t.isFeatured);
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Tags</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">{tags.length} tags total</p>
      </div>
      <section>
        <h2 className="text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))] mb-3">Featured</h2>
        <div className="flex flex-wrap gap-2">
          {featured.map((t) => (
            <Link key={t.id} href={`/tags/${t.slug}`}>
              <Pill tone="accent" size="md">#{t.slug}</Pill>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-sm uppercase tracking-wide text-[rgb(var(--color-fg-muted))] mb-3">All tags</h2>
        <div className="flex flex-wrap gap-2">
          {rest.map((t) => (
            <Link key={t.id} href={`/tags/${t.slug}`}>
              <Pill tone="neutral" size="md">#{t.slug}</Pill>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
