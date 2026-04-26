/**
 * @file Compact PublisherCard for grids and admin lists.
 */

import Link from "next/link";
import { Card, CardBody, Pill, Avatar } from "@/components/ui";
import type { Publisher } from "@/lib/types";

export function PublisherCard({ publisher }: { publisher: Publisher }) {
  return (
    <Link href={`/publishers/${publisher.slug}`} className="block">
      <Card className="hover:border-[rgb(var(--color-accent))] transition-colors h-full">
        <CardBody className="flex items-start gap-3">
          <Avatar name={publisher.name} src={publisher.logoUrl} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{publisher.name}</h3>
              <Pill
                tone={publisher.type === "person" ? "type-person" : "type-company"}
                size="sm"
              >
                {publisher.type === "person" ? "Person" : "Company"}
              </Pill>
            </div>
            {publisher.description ? (
              <p className="text-sm text-[rgb(var(--color-fg-muted))] line-clamp-2">
                {publisher.description}
              </p>
            ) : null}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
