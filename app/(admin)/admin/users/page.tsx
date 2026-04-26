/**
 * @file Admin users — list of profiles with role and ban state.
 */

import { getRepository } from "@/lib/data";
import { Pill } from "@/components/ui/pill";
import { absoluteDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getRepository().profiles.list();
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">{users.length} accounts</p>
      </header>
      <table className="w-full text-sm">
        <thead className="text-left text-[rgb(var(--color-fg-muted))] border-b border-[rgb(var(--color-line))]">
          <tr>
            <th className="py-2">Email</th>
            <th className="py-2">Display name</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
            <th className="py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userId} className="border-b border-[rgb(var(--color-line))]">
              <td className="py-2 font-mono text-xs">{u.email}</td>
              <td className="py-2">{u.displayName ?? "—"}</td>
              <td className="py-2">
                {u.role === "admin" ? (
                  <Pill tone="warning" size="sm">Admin</Pill>
                ) : (
                  <Pill tone="neutral" size="sm">User</Pill>
                )}
              </td>
              <td className="py-2">
                {u.isBanned ? (
                  <Pill tone="danger" size="sm">Banned</Pill>
                ) : (
                  <Pill tone="success" size="sm">Active</Pill>
                )}
              </td>
              <td className="py-2 text-[rgb(var(--color-fg-muted))]">
                {absoluteDate(u.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
