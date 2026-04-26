/**
 * @file Account page — basic profile info + a clearly labeled sign-out.
 *
 * Sign-out is also available from the top-nav avatar menu and the
 * settings sidebar. This page hosts the canonical "destructive" action
 * surface so users always have an obvious way out.
 */

import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "../../../(public)/login/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireUser();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">Manage your DevFeed identity.</p>
      </header>

      <Card>
        <CardBody className="space-y-2 text-sm">
          <p>
            <span className="text-[rgb(var(--color-fg-muted))]">Display name:</span>{" "}
            {session.user.displayName ?? "—"}
          </p>
          <p>
            <span className="text-[rgb(var(--color-fg-muted))]">Email:</span> {session.user.email}
          </p>
          <p>
            <span className="text-[rgb(var(--color-fg-muted))]">Role:</span> {session.user.role}
          </p>
        </CardBody>
      </Card>

      <Card className="border-[rgb(var(--color-danger))]/30">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-2">
              <LogOut size={16} aria-hidden /> Sign out
            </p>
            <p className="text-sm text-[rgb(var(--color-fg-muted))]">
              Ends your session on this device. You can also sign out from the avatar menu in the
              top right or from the sidebar.
            </p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="danger">
              Sign out
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
