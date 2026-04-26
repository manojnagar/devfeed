/**
 * @file Admin sources — feed health overview + add new source.
 */

import { getRepository } from "@/lib/data";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addSourceAction } from "../actions";
import { relativeTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const repo = getRepository();
  const [publishers, sources] = await Promise.all([
    repo.publishers.list({ isActive: true }),
    repo.blogSources.listActive(),
  ]);
  const publisherById = new Map(publishers.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Sources</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          {sources.length} active sources
        </p>
      </header>

      <Card>
        <CardBody>
          <CardTitle className="mb-3">Add a feed source</CardTitle>
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
        </CardBody>
      </Card>

      <ul className="space-y-2">
        {sources.map((s) => {
          const publisher = publisherById.get(s.publisherId);
          const healthy = s.consecutiveFailures === 0;
          return (
            <li key={s.id}>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-2">
                    <Pill tone="neutral" size="sm">{s.kind.toUpperCase()}</Pill>
                    <p className="font-medium truncate">{publisher?.name ?? s.publisherId}</p>
                    {healthy ? (
                      <Pill tone="success" size="sm">Healthy</Pill>
                    ) : (
                      <Pill tone="danger" size="sm">{s.consecutiveFailures} failures</Pill>
                    )}
                  </div>
                  <p className="text-xs text-[rgb(var(--color-fg-muted))] truncate mt-0.5">
                    {s.feedUrl}
                  </p>
                  <div className="text-xs text-[rgb(var(--color-fg-muted))] mt-1 flex gap-3">
                    {s.lastFetchedAt ? <span>Last fetched {relativeTime(s.lastFetchedAt)}</span> : null}
                    {s.lastErrorMessage ? (
                      <span className="text-[rgb(var(--color-danger))]">
                        Last error: {s.lastErrorMessage}
                      </span>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
