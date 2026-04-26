/**
 * @file Admin users — list of profiles with inline role + ban controls.
 *
 * The Server Component fetches all profiles, then renders one row per
 * profile. Mutating controls live in a Client Component
 * (`UserRowControls`) so they can use `useActionState` for inline
 * feedback. The current admin's own row renders a read-only marker
 * because the server actions also reject self-mutations.
 *
 * Safety guards (defense-in-depth) live in the actions, not the UI:
 *   - `requireAdmin()` 404s for non-admins.
 *   - Self-mutation is rejected.
 *   - Demoting / banning the last active admin is rejected.
 *   - Every change writes an `audit_log` entry.
 */

import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { Pill } from "@/components/ui/pill";
import { absoluteDate } from "@/lib/dates";
import { UserRowControls } from "./_components/user-row-controls";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const users = await getRepository().profiles.list();
  const sorted = [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
  const adminCount = users.filter((u) => u.role === "admin" && !u.isBanned).length;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          {users.length} {users.length === 1 ? "account" : "accounts"} ·{" "}
          {adminCount} active {adminCount === 1 ? "admin" : "admins"}
        </p>
      </header>

      {adminCount <= 1 ? (
        <p className="mb-4 rounded-md border border-[rgb(var(--color-warning))] bg-[rgb(var(--color-warning))]/10 px-3 py-2 text-sm text-[rgb(var(--color-warning))]">
          Only one active admin. Promote a second user before demoting or banning the last
          remaining admin.
        </p>
      ) : null}

      <table className="w-full text-sm">
        <thead className="text-left text-[rgb(var(--color-fg-muted))] border-b border-[rgb(var(--color-line))]">
          <tr>
            <th className="py-2">Email</th>
            <th className="py-2">Display name</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
            <th className="py-2">Joined</th>
            <th className="py-2">Manage</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr key={u.userId} className="border-b border-[rgb(var(--color-line))] align-top">
              <td className="py-2 font-mono text-xs">{u.email}</td>
              <td className="py-2">{u.displayName ?? "—"}</td>
              <td className="py-2">
                {u.role === "admin" ? (
                  <Pill tone="warning" size="sm">
                    Admin
                  </Pill>
                ) : (
                  <Pill tone="neutral" size="sm">
                    User
                  </Pill>
                )}
              </td>
              <td className="py-2">
                {u.isBanned ? (
                  <Pill tone="danger" size="sm">
                    Banned
                  </Pill>
                ) : (
                  <Pill tone="success" size="sm">
                    Active
                  </Pill>
                )}
              </td>
              <td className="py-2 text-[rgb(var(--color-fg-muted))]">
                {absoluteDate(u.createdAt)}
              </td>
              <td className="py-2">
                <UserRowControls
                  userId={u.userId}
                  email={u.email}
                  role={u.role}
                  isBanned={u.isBanned}
                  isCurrentUser={u.userId === session.user.userId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
