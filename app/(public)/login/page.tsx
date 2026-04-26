/**
 * @file Login page.
 *
 * Email magic link form + Google/GitHub buttons + stub-only demo
 * sign-in shortcuts. The form posts to a Server Action so it works
 * without JavaScript and is CSRF-safe by Next.js construction.
 */

import Link from "next/link";
import { getEnv } from "@/lib/env";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  signInAsDemoAdminAction,
  signInAsDemoUserAction,
  signInWithEmailAction,
} from "./actions";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const env = getEnv();
  const isStub = env.AUTH_ADAPTER === "stub";

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardBody className="space-y-5">
          <div>
            <CardTitle>Sign in to DevFeed</CardTitle>
            <p className="text-sm text-[rgb(var(--color-fg-muted))] mt-1">
              Sign in to bookmark posts, follow publishers, and tune your digest.
            </p>
          </div>
          {sp.error ? (
            <p
              role="alert"
              className="text-sm text-[rgb(var(--color-danger))] bg-[rgb(var(--color-danger))]/10 rounded-md px-3 py-2"
            >
              {decodeURIComponent(sp.error)}
            </p>
          ) : null}

          <form action={signInWithEmailAction} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Send magic link
            </Button>
          </form>

          {isStub ? (
            <div className="space-y-2 pt-3 border-t border-[rgb(var(--color-line))]">
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">
                Stub auth (development only)
              </p>
              <form action={signInAsDemoUserAction}>
                <Button type="submit" variant="secondary" className="w-full">
                  Sign in as demo user
                </Button>
              </form>
              <form action={signInAsDemoAdminAction}>
                <Button type="submit" variant="ghost" className="w-full">
                  Sign in as demo admin
                </Button>
              </form>
            </div>
          ) : null}

          <p className="text-xs text-[rgb(var(--color-fg-muted))] text-center">
            By signing in you agree to our <Link href="/about" className="underline">terms</Link>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
