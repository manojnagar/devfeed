/**
 * @file Admin sources — feed health overview + full CRUD.
 *
 * Admin can:
 *  - Add a new feed source (top form).
 *  - Edit an existing source's publisher / URL / kind (inline form per row).
 *  - Hide / activate without losing historical posts.
 *  - Hard-delete with cascade (typed-confirm dialog per row).
 *
 * The page lists ALL sources (not only active) so admins can resurrect a
 * previously-hidden feed without having to query the DB. The list/CRUD
 * methods in `BlogSourceRepository` enforce uniqueness on
 * `(publisherId, feedUrl)` and write every change to `audit_log` — see
 * `app/(admin)/admin/actions.ts` for the action-side guards.
 */

import { getRepository } from "@/lib/data";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addSourceAction } from "../actions";
import { SourceRow } from "./_components/source-row";
import { TestFeedAddForm } from "./_components/test-feed-panel";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const repo = getRepository();
  const [publishers, sources] = await Promise.all([
    repo.publishers.list({ isActive: true }),
    repo.blogSources.list(),
  ]);
  const publisherById = new Map(publishers.map((p) => [p.id, p]));
  const publisherOptions = publishers.map((p) => ({ id: p.id, name: p.name }));

  const activeCount = sources.filter((s) => s.isActive).length;
  const hiddenCount = sources.length - activeCount;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Sources</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          {activeCount} active
          {hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
        </p>
      </header>

      <Card>
        <CardBody>
          <CardTitle className="mb-1">Add a feed source</CardTitle>
          <p className="text-xs text-[rgb(var(--color-fg-muted))] mb-3">
            Test the URL first to confirm it parses, then save. Tests don&apos;t touch the catalog or
            health columns.
          </p>
          <form action={addSourceAction} className="grid sm:grid-cols-[1fr_2fr_120px_auto] gap-2 items-end">
            <div>
              <Label htmlFor="publisherId">Publisher</Label>
              <Select id="publisherId" name="publisherId" required>
                <option value="">Select…</option>
                {publishers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="feedUrl">Feed URL</Label>
              <Input id="feedUrl" name="feedUrl" type="url" required placeholder="https://example.com/feed.xml" />
            </div>
            <div>
              <Label htmlFor="kind">Kind</Label>
              <Select id="kind" name="kind" defaultValue="rss">
                <option value="rss">RSS</option>
                <option value="atom">Atom</option>
                <option value="scrape">Scrape</option>
              </Select>
            </div>
            <Button type="submit" variant="primary">Add</Button>
          </form>
          <div className="mt-3 grid sm:grid-cols-[1fr_2fr_120px_auto] gap-2 items-start">
            <div className="hidden sm:block" />
            <div className="sm:col-span-3 flex items-start gap-2">
              <TestFeedAddForm feedInputId="feedUrl" />
            </div>
          </div>
        </CardBody>
      </Card>

      <ul className="space-y-2">
        {sources.map((s) => {
          const publisher = publisherById.get(s.publisherId);
          return (
            <li key={s.id}>
              <Card>
                <CardBody>
                  <SourceRow
                    source={s}
                    publishers={publisherOptions}
                    publisherName={publisher?.name ?? null}
                  />
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
