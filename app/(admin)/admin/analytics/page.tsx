/**
 * @file Admin analytics — aggregated read events.
 */

import { getRepository } from "@/lib/data";
import { Card, CardBody, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const repo = getRepository();
  const [byDay, topPubs, byAccess, publishers] = await Promise.all([
    repo.readEvents.countByDay(30),
    repo.readEvents.countByPublisher(30, 10),
    repo.readEvents.countByAccess(30),
    repo.publishers.list(),
  ]);
  const publisherById = new Map(publishers.map((p) => [p.id, p]));
  const max = Math.max(1, ...byDay.map((d) => d.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">Last 30 days of read events.</p>
      </header>

      <Card>
        <CardBody>
          <CardTitle className="mb-3">Reads per day</CardTitle>
          {byDay.length === 0 ? (
            <p className="text-sm text-[rgb(var(--color-fg-muted))]">No reads recorded yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {byDay.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 bg-[rgb(var(--color-accent))] rounded-sm"
                  style={{ height: `${(d.count / max) * 100}%` }}
                  title={`${d.day}: ${d.count}`}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <CardTitle className="mb-3">Top publishers</CardTitle>
            {topPubs.length === 0 ? (
              <p className="text-sm text-[rgb(var(--color-fg-muted))]">No data yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {topPubs.map((p) => (
                  <li key={p.publisherId} className="flex items-center justify-between">
                    <span>{publisherById.get(p.publisherId)?.name ?? p.publisherId}</span>
                    <span className="font-mono text-[rgb(var(--color-fg-muted))]">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <CardTitle className="mb-3">Reads by access label</CardTitle>
            {byAccess.length === 0 ? (
              <p className="text-sm text-[rgb(var(--color-fg-muted))]">No data yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {byAccess.map((a) => (
                  <li key={a.accessLabel} className="flex items-center justify-between">
                    <span className="capitalize">{a.accessLabel.replace("_", " ")}</span>
                    <span className="font-mono text-[rgb(var(--color-fg-muted))]">{a.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
