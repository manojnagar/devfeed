/**
 * @file Admin audit log — recent admin actions.
 */

import { getRepository } from "@/lib/data";
import { absoluteDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const entries = await getRepository().audit.list(100);
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">Last {entries.length} events</p>
      </header>
      {entries.length === 0 ? (
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">No audit entries yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-[rgb(var(--color-fg-muted))] border-b border-[rgb(var(--color-line))]">
            <tr>
              <th className="py-2">When</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
              <th className="py-2">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[rgb(var(--color-line))]">
                <td className="py-2 text-[rgb(var(--color-fg-muted))] font-mono text-xs">
                  {absoluteDate(e.occurredAt)} {e.occurredAt.slice(11, 16)}
                </td>
                <td className="py-2">{e.action}</td>
                <td className="py-2 font-mono text-xs">{e.targetType}/{e.targetId.slice(0, 12)}</td>
                <td className="py-2 font-mono text-xs">{e.actorUserId?.slice(0, 12) ?? "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
