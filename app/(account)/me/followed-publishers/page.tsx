/**
 * @file Followed publishers page.
 */

import { Newspaper } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import Link from "next/link";
import { togglePublisherFollowAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function FollowedPublishersPage() {
  const session = await requireUser();
  const followed = await getRepository().follows.listFollowedPublishers(session.user.userId);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Followed publishers</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          {followed.length} {followed.length === 1 ? "publisher" : "publishers"} in your digest
        </p>
      </header>
      {followed.length === 0 ? (
        <EmptyState
          icon={<Newspaper size={28} />}
          title="You don't follow any publishers"
          description="Visit a publisher page and tap Follow to receive their posts in your digest."
          action={
            <Link href="/publishers" className={buttonClassName()}>
              Browse publishers
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {followed.map((p) => (
            <li key={p.id}>
              <Card>
                <CardBody className="flex items-center gap-3">
                  <Avatar src={p.logoUrl} name={p.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/publishers/${p.slug}`}
                      className="font-medium hover:text-[rgb(var(--color-accent))]"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-[rgb(var(--color-fg-muted))] flex items-center gap-2">
                      <Pill tone={p.type === "person" ? "type-person" : "type-company"} size="sm">
                        {p.type === "person" ? "Person" : "Company"}
                      </Pill>
                      {p.description ? <span className="truncate">{p.description}</span> : null}
                    </div>
                  </div>
                  <form action={togglePublisherFollowAction}>
                    <input type="hidden" name="publisherId" value={p.id} />
                    <button
                      type="submit"
                      className="text-xs text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-danger))]"
                    >
                      Unfollow
                    </button>
                  </form>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
