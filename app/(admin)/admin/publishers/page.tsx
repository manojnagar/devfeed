/**
 * @file Admin publishers list — manage active state + add new entry.
 */

import Link from "next/link";
import { getRepository } from "@/lib/data";
import { Card, CardBody } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { togglePublisherActiveAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPublishersPage() {
  const publishers = await getRepository().publishers.list();
  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Publishers</h1>
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">
            {publishers.length} in the catalog
          </p>
        </div>
        <Link
          href="/admin/publishers/new"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[rgb(var(--color-accent))] text-[rgb(var(--color-on-accent))] text-sm font-medium"
        >
          Add publisher
        </Link>
      </header>
      <ul className="space-y-2">
        {publishers.map((p) => (
          <li key={p.id}>
            <Card>
              <CardBody className="flex items-center gap-3">
                <Avatar name={p.name} src={p.logoUrl} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/publishers/${p.slug}`}
                      className="font-medium hover:text-[rgb(var(--color-accent))]"
                    >
                      {p.name}
                    </Link>
                    <Pill tone={p.type === "person" ? "type-person" : "type-company"} size="sm">
                      {p.type === "person" ? "Person" : "Company"}
                    </Pill>
                    {p.isActive ? (
                      <Pill tone="success" size="sm">Active</Pill>
                    ) : (
                      <Pill tone="warning" size="sm">Hidden</Pill>
                    )}
                  </div>
                  <p className="text-xs text-[rgb(var(--color-fg-muted))] truncate">
                    {p.websiteUrl}
                  </p>
                </div>
                <form action={togglePublisherActiveAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(!p.isActive)} />
                  <button
                    type="submit"
                    className="text-xs text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))]"
                  >
                    {p.isActive ? "Hide" : "Activate"}
                  </button>
                </form>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
