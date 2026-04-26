/**
 * @file Admin tags — view all tags + featured flags.
 */

import { getRepository } from "@/lib/data";
import { Pill } from "@/components/ui/pill";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const tags = await getRepository().tags.list();
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">{tags.length} tags total</p>
      </header>
      <table className="w-full text-sm">
        <thead className="text-left text-[rgb(var(--color-fg-muted))] border-b border-[rgb(var(--color-line))]">
          <tr>
            <th className="py-2">Slug</th>
            <th className="py-2">Name</th>
            <th className="py-2">Description</th>
            <th className="py-2">Featured</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((t) => (
            <tr key={t.id} className="border-b border-[rgb(var(--color-line))]">
              <td className="py-2 font-mono text-xs">{t.slug}</td>
              <td className="py-2">{t.name}</td>
              <td className="py-2 text-[rgb(var(--color-fg-muted))]">{t.description ?? "—"}</td>
              <td className="py-2">
                {t.isFeatured ? <Pill tone="accent" size="sm">Featured</Pill> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
