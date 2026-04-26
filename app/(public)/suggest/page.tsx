/**
 * @file Suggest a publisher form.
 *
 * Uses Server Actions for submission. Validation, rate-limiting, and
 * RSS auto-discovery happen server-side in `actions.ts`.
 */

import { requireUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { SuggestForm } from "./_components/suggest-form";

export default async function SuggestPage() {
  await requireUser("/suggest");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Suggest a publisher</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          Recommend a company engineering blog or an individual author. We&apos;ll review and add it
          to the catalog.
        </p>
      </header>
      <Card>
        <CardBody>
          <SuggestForm />
          <p className="mt-4 text-xs text-[rgb(var(--color-fg-muted))]">
            Tip: leave the feed URL empty to let us auto-discover the RSS / Atom feed.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
