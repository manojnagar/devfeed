/**
 * @file Site footer.
 */

import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[rgb(var(--color-line))]">
      <div className="container mx-auto max-w-6xl px-4 py-8 grid gap-4 md:grid-cols-3 text-sm text-[rgb(var(--color-fg-muted))]">
        <div>
          <p className="font-semibold text-[rgb(var(--color-fg))]">DevFeed</p>
          <p className="mt-1 max-w-xs">
            A calm reader for the best engineering blogs. Free, open, and ad-free.
          </p>
        </div>
        <nav className="space-y-1">
          <p className="font-semibold text-[rgb(var(--color-fg))]">Browse</p>
          <Link href="/" className="block hover:text-[rgb(var(--color-accent))]">Feed</Link>
          <Link href="/publishers" className="block hover:text-[rgb(var(--color-accent))]">Publishers</Link>
          <Link href="/tags" className="block hover:text-[rgb(var(--color-accent))]">Tags</Link>
        </nav>
        <nav className="space-y-1">
          <p className="font-semibold text-[rgb(var(--color-fg))]">Project</p>
          <Link href="/about" className="block hover:text-[rgb(var(--color-accent))]">About</Link>
          <Link href="/suggest" className="block hover:text-[rgb(var(--color-accent))]">Suggest a publisher</Link>
        </nav>
      </div>
    </footer>
  );
}
