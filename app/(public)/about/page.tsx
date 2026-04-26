/**
 * @file Static About page.
 */

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 prose">
      <h1 className="text-3xl font-semibold mb-3">About DevFeed</h1>
      <p className="text-[rgb(var(--color-fg-muted))]">
        DevFeed is a calm, ad-free reader for the best engineering blogs from companies and
        individual authors. The catalog is community-curated and free to browse anonymously.
      </p>
      <h2 className="text-xl font-semibold mt-8 mb-2">Principles</h2>
      <ul className="list-disc pl-6 space-y-1 text-[rgb(var(--color-fg-muted))]">
        <li>Free forever for readers — no ads, no trackers.</li>
        <li>Open to community contributions: anyone can suggest a publisher.</li>
        <li>Privacy first: anonymous browsing works without accounts; analytics never store raw PII.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">Open by design</h2>
      <p className="text-[rgb(var(--color-fg-muted))]">
        The feed catalog is curated transparently. Every change is recorded in the admin audit
        log; every digest you receive includes a one-click unsubscribe.
      </p>
    </div>
  );
}
