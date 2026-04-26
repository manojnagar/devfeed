/**
 * @file Site-wide 404 page.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">404</p>
        <h1 className="text-3xl font-semibold mt-2 mb-3">We couldn&apos;t find that page</h1>
        <p className="text-[rgb(var(--color-fg-muted))] mb-6">
          The link may be broken, or the page may have been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[rgb(var(--color-accent))] text-[rgb(var(--color-on-accent))] text-sm font-medium"
        >
          Back to the feed
        </Link>
      </div>
    </div>
  );
}
