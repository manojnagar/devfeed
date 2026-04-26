/**
 * @file Per-row admin controls for the /admin/users table.
 *
 * Renders an inline role select + ban/unban form bound to the
 * `setUserRoleAction` and `setUserBannedAction` Server Actions via
 * `useActionState`. When the action returns `{ ok: false, message }`
 * the message is rendered next to the row so the admin can see why
 * the change was blocked (e.g. self-mutation or last-admin guard).
 *
 * The component intentionally renders nothing for the row that matches
 * the currently signed-in admin — a UX guardrail layered on top of the
 * server-side guard so the admin can never accidentally lock themselves
 * out of the console.
 */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  setUserRoleAction,
  setUserBannedAction,
  type UserAdminActionResult,
} from "../../actions";
import type { UserRole } from "@/lib/types";

const INITIAL: UserAdminActionResult | null = null;

export interface UserRowControlsProps {
  userId: string;
  email: string;
  role: UserRole;
  isBanned: boolean;
  isCurrentUser: boolean;
}

function SubmitGhost({ children, label }: { children: React.ReactNode; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function UserRowControls({
  userId,
  email,
  role,
  isBanned,
  isCurrentUser,
}: UserRowControlsProps) {
  if (isCurrentUser) {
    return (
      <span className="text-xs text-[rgb(var(--color-fg-muted))]" title="That's you">
        (signed in)
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <RoleSelect userId={userId} email={email} role={role} />
        <BanToggle userId={userId} email={email} isBanned={isBanned} />
      </div>
    </div>
  );
}

function RoleSelect({
  userId,
  email,
  role,
}: {
  userId: string;
  email: string;
  role: UserRole;
}) {
  const [state, formAction] = useActionState(setUserRoleAction, INITIAL);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role for {email}
      </label>
      <select
        id={`role-${userId}`}
        name="role"
        defaultValue={role}
        className="text-xs rounded-md border border-[rgb(var(--color-line-strong))] bg-[rgb(var(--color-surface-elevated))] px-2 py-1"
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <SubmitGhost label={`Update role for ${email}`}>Update</SubmitGhost>
      <ResultText state={state} />
    </form>
  );
}

function BanToggle({
  userId,
  email,
  isBanned,
}: {
  userId: string;
  email: string;
  isBanned: boolean;
}) {
  const [state, formAction] = useActionState(setUserBannedAction, INITIAL);
  const next = !isBanned;
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isBanned" value={String(next)} />
      <SubmitGhost label={next ? `Ban ${email}` : `Unban ${email}`}>
        {next ? "Ban" : "Unban"}
      </SubmitGhost>
      <ResultText state={state} />
    </form>
  );
}

function ResultText({ state }: { state: UserAdminActionResult | null }) {
  if (!state?.message) return null;
  return (
    <span
      role="status"
      className={
        state.ok
          ? "text-xs text-[rgb(var(--color-success))]"
          : "text-xs text-[rgb(var(--color-danger))]"
      }
    >
      {state.message}
    </span>
  );
}
