/**
 * @file Admin: edit an existing publisher.
 *
 * Editable fields cover the public-facing identity (name, logo, website,
 * description, social handles) and the default access label that drives
 * paywall pills on cards. Operational fields (`isActive`, `isVerified`,
 * `createdAt`, …) are intentionally out of scope here — the list page
 * already exposes the active toggle, and verification is awarded by a
 * separate moderation flow.
 */

import { notFound } from "next/navigation";
import Link from "next/link";

import { getRepository } from "@/lib/data";
import { upsertPublisherAction } from "../../../actions";
import { PublisherForm } from "../../_components/publisher-form";

interface EditPublisherPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditPublisherPage({ params }: EditPublisherPageProps) {
  const { id } = await params;
  const publisher = await getRepository().publishers.getById(id);
  if (!publisher) notFound();

  return (
    <div>
      <Link
        href="/admin/publishers"
        className="mb-3 inline-flex items-center gap-1 text-sm text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))]"
      >
        ← Back to publishers
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Edit publisher</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          Changes apply immediately to{" "}
          <Link
            href={`/publishers/${publisher.slug}`}
            className="underline hover:text-[rgb(var(--color-accent))]"
          >
            /publishers/{publisher.slug}
          </Link>
          .
        </p>
      </header>
      <PublisherForm action={upsertPublisherAction} publisher={publisher} />
    </div>
  );
}
