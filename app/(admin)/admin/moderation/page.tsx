/**
 * @file Moderation queue — pending publisher suggestions.
 */

import { getRepository } from "@/lib/data";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { decideSuggestionAction } from "../actions";
import { absoluteDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const repo = getRepository();
  const pending = await repo.suggestions.listByStatus("pending");

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Moderation queue</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          {pending.length} pending {pending.length === 1 ? "suggestion" : "suggestions"}
        </p>
      </header>
      {pending.length === 0 ? (
        <EmptyState title="Nothing pending" description="The queue is empty — back to triaging tags." />
      ) : (
        <ul className="space-y-3">
          {pending.map((s) => (
            <li key={s.id}>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Pill tone={s.type === "person" ? "type-person" : "type-company"} size="sm">
                      {s.type === "person" ? "Person" : "Company"}
                    </Pill>
                  </div>
                  <p className="text-sm text-[rgb(var(--color-fg-muted))]">
                    <a className="underline" href={s.websiteUrl} target="_blank" rel="noopener noreferrer">
                      {s.websiteUrl}
                    </a>
                  </p>
                  {s.reason ? <p className="text-sm mt-2">{s.reason}</p> : null}
                  {s.autoValidation ? (
                    <ul className="mt-3 text-xs text-[rgb(var(--color-fg-muted))] space-y-0.5">
                      <li>RSS detected: {s.autoValidation.rssDetected ? "yes" : "no"}</li>
                      {s.autoValidation.rssUrl ? (
                        <li>Feed URL: <code>{s.autoValidation.rssUrl}</code></li>
                      ) : null}
                      {s.autoValidation.inferredAccess ? (
                        <li>Inferred access: {s.autoValidation.inferredAccess}</li>
                      ) : null}
                      {s.autoValidation.notes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  ) : null}
                </CardBody>
                <CardFooter className="flex flex-col gap-2 items-stretch">
                  <form action={decideSuggestionAction} className="flex flex-col gap-2">
                    <input type="hidden" name="suggestionId" value={s.id} />
                    <Textarea name="reviewerNotes" rows={2} placeholder="Optional reviewer notes…" />
                    <div className="flex gap-2 justify-between">
                      <p className="text-xs text-[rgb(var(--color-fg-subtle))] self-center">
                        Submitted {absoluteDate(s.createdAt)}
                      </p>
                      <div className="flex gap-2">
                        <Button type="submit" name="decision" value="needs_changes" variant="ghost" size="sm">
                          Needs changes
                        </Button>
                        <Button type="submit" name="decision" value="reject" variant="danger" size="sm">
                          Reject
                        </Button>
                        <Button type="submit" name="decision" value="approve" variant="primary" size="sm">
                          Approve
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
