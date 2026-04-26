/**
 * @file User-submitted publisher suggestions and their statuses.
 */

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import { absoluteDate } from "@/lib/dates";
import type { SuggestionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<SuggestionStatus, "neutral" | "success" | "danger" | "warning"> = {
  pending: "neutral",
  approved: "success",
  rejected: "danger",
  needs_changes: "warning",
};

interface Props {
  searchParams: Promise<{ submitted?: string }>;
}

export default async function MySuggestionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await requireUser();
  const items = await getRepository().suggestions.listForUser(session.user.userId);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My suggestions</h1>
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">
            {items.length} {items.length === 1 ? "submission" : "submissions"} so far
          </p>
        </div>
        <Link href="/suggest" className={buttonClassName()}>
          Suggest another
        </Link>
      </header>

      {sp.submitted ? (
        <p className="mb-4 text-sm text-[rgb(var(--color-success))] bg-[rgb(var(--color-success))]/10 rounded-md px-3 py-2">
          Thanks! Your suggestion is in the moderation queue.
        </p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} />}
          title="No suggestions yet"
          description="Recommend a company blog or individual author to expand the catalog."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id}>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Pill
                      tone={s.type === "person" ? "type-person" : "type-company"}
                      size="sm"
                    >
                      {s.type === "person" ? "Person" : "Company"}
                    </Pill>
                    <Pill tone={STATUS_TONE[s.status]} size="sm">
                      {s.status.replace("_", " ")}
                    </Pill>
                  </div>
                  <p className="text-sm text-[rgb(var(--color-fg-muted))] truncate">
                    {s.websiteUrl}
                  </p>
                  {s.reviewerNotes ? (
                    <p className="mt-2 text-sm text-[rgb(var(--color-fg-muted))]">
                      <span className="font-medium text-[rgb(var(--color-fg))]">Reviewer:</span>{" "}
                      {s.reviewerNotes}
                    </p>
                  ) : null}
                </CardBody>
                <CardFooter className="text-xs text-[rgb(var(--color-fg-muted))]">
                  Submitted {absoluteDate(s.createdAt)}
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
