/**
 * @file Site-wide error boundary.
 *
 * Logged via the structured logger and shown as a friendly retry page.
 */

"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[devfeed] page_error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-danger))]">Error</p>
        <h1 className="text-3xl font-semibold mt-2 mb-3">Something went wrong</h1>
        <p className="text-[rgb(var(--color-fg-muted))] mb-6">
          We logged the error and are looking into it. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[rgb(var(--color-accent))] text-[rgb(var(--color-on-accent))] text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
