/**
 * @file Public list of all publishers (companies + people).
 */

import Link from "next/link";
import { getRepository } from "@/lib/data";
import { PublisherCard } from "@/components/publisher/publisher-card";
import { Pill } from "@/components/ui/pill";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function PublishersIndex({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = sp.type === "person" || sp.type === "company" ? sp.type : undefined;
  const all = await getRepository().publishers.list({
    type: filter ? [filter] : undefined,
    isActive: true,
  });
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Publishers</h1>
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">
            {all.length} {filter ? filter : "publishers"} in the catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/publishers"><Pill tone="neutral" active={!filter}>All</Pill></Link>
          <Link href="/publishers?type=company"><Pill tone="type-company" active={filter === "company"}>Companies</Pill></Link>
          <Link href="/publishers?type=person"><Pill tone="type-person" active={filter === "person"}>People</Pill></Link>
        </div>
      </header>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {all.map((p) => (
          <li key={p.id}>
            <PublisherCard publisher={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
