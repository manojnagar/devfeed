/**
 * @file Followed tags page.
 */

import { Tag } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { toggleTagFollowAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function FollowedTagsPage() {
  const session = await requireUser();
  const repo = getRepository();
  const followed = await repo.follows.listFollowedTags(session.user.userId);
  const all = await repo.tags.list({ featuredOnly: true });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-1">Followed tags</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))] mb-3">
          {followed.length} {followed.length === 1 ? "tag" : "tags"} influencing your feed and digest
        </p>
        {followed.length === 0 ? (
          <EmptyState
            icon={<Tag size={28} />}
            title="You don't follow any tags"
            description="Pick from the featured tags below or browse the full list."
          />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {followed.map((t) => (
              <li key={t.id}>
                <form action={toggleTagFollowAction} className="inline-flex items-center gap-1">
                  <input type="hidden" name="tagId" value={t.id} />
                  <Link href={`/tags/${t.slug}`}>
                    <Pill tone="accent" size="md">#{t.slug}</Pill>
                  </Link>
                  <button
                    type="submit"
                    className="text-xs text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-danger))]"
                    aria-label={`Unfollow ${t.slug}`}
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Suggested featured tags</h2>
        <ul className="flex flex-wrap gap-2">
          {all
            .filter((t) => !followed.some((f) => f.id === t.id))
            .map((t) => (
              <li key={t.id}>
                <form action={toggleTagFollowAction}>
                  <input type="hidden" name="tagId" value={t.id} />
                  <button
                    type="submit"
                    className="inline-flex"
                    aria-label={`Follow ${t.slug}`}
                  >
                    <Pill tone="neutral" size="md">+ #{t.slug}</Pill>
                  </button>
                </form>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
