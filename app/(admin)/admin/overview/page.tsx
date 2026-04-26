/**
 * @file Admin overview — high-level KPIs.
 */

import { getRepository } from "@/lib/data";
import { Card, CardBody } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface Kpi {
  label: string;
  value: string;
  hint?: string;
}

export default async function AdminOverview() {
  const repo = getRepository();
  const [publishers, posts, suggestions, reads, audits] = await Promise.all([
    repo.publishers.list(),
    repo.posts.list({ pageSize: 1 }),
    repo.suggestions.listByStatus("pending"),
    repo.readEvents.countTotal(),
    repo.audit.list(5),
  ]);

  const kpis: Kpi[] = [
    { label: "Publishers", value: String(publishers.length) },
    { label: "Posts", value: String(posts.total) },
    { label: "Pending suggestions", value: String(suggestions.length) },
    { label: "Total reads", value: String(reads), hint: "All time" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">High-level health of the catalog.</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardBody>
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
                {k.label}
              </p>
              <p className="text-2xl font-semibold mt-1">{k.value}</p>
              {k.hint ? (
                <p className="text-xs text-[rgb(var(--color-fg-subtle))]">{k.hint}</p>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold mb-3">Recent admin actions</h2>
          {audits.length === 0 ? (
            <p className="text-sm text-[rgb(var(--color-fg-muted))]">No actions yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm font-mono">
              {audits.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <time
                    className="text-[rgb(var(--color-fg-muted))]"
                    dateTime={a.occurredAt}
                  >
                    {a.occurredAt.slice(11, 19)}
                  </time>
                  <span className="text-[rgb(var(--color-accent))]">{a.action}</span>
                  <span className="text-[rgb(var(--color-fg-muted))] truncate">{a.targetType}/{a.targetId.slice(0, 8)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
