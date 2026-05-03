/**
 * @file Admin publishers list — search, manage active state, edit, add new.
 *
 * Search is a plain GET form (no JS required) — submits `?q=…` and the
 * server filters the in-memory list by name / slug / website / handles.
 * The catalog is ~order(hundreds), so client-side post-filter is cheap;
 * if it ever grows we can push the predicate into the repository layer.
 */

import Link from "next/link";

import { getRepository } from "@/lib/data";
import { Card, CardBody } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar } from "@/components/ui/avatar";
import { buttonClassName, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolvePublisherLogoCandidates } from "@/lib/publisher-logo";
import { deletePublisherAction, togglePublisherActiveAction } from "../actions";
import { DeletePublisherButton } from "./_components/delete-publisher-button";

/**
 * Shared classes for the inline row actions (Edit / Hide / Delete) so
 * they all line up on the same baseline and share the muted→accent
 * hover transition. Delete keeps the same shape but transitions to
 * the danger color to flag its destructiveness.
 */
const ROW_ACTION_CLASS =
  "inline-flex items-center text-xs font-medium leading-none text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))] transition-colors";
const ROW_ACTION_DANGER_CLASS =
  "inline-flex items-center text-xs font-medium leading-none text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-danger))] transition-colors";

export const dynamic = "force-dynamic";

const MAX_QUERY_LEN = 120;

interface AdminPublishersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminPublishersPage({ searchParams }: AdminPublishersPageProps) {
  const sp = await searchParams;
  const rawQuery = typeof sp.q === "string" ? sp.q : "";
  const query = rawQuery.trim().slice(0, MAX_QUERY_LEN);
  const queryLower = query.toLowerCase();

  const all = await getRepository().publishers.list();
  const publishers = query
    ? all.filter((p) => {
        const haystack = [
          p.name,
          p.slug,
          p.websiteUrl,
          p.twitterHandle ?? "",
          p.githubHandle ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(queryLower);
      })
    : all;

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Publishers</h1>
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">
            {query
              ? `${publishers.length} matching "${query}" · ${all.length} total`
              : `${all.length} in the catalog`}
          </p>
        </div>
        <Link href="/admin/publishers/new" className={buttonClassName()}>
          Add publisher
        </Link>
      </header>

      <form
        method="get"
        action="/admin/publishers"
        role="search"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <label htmlFor="publisher-search" className="sr-only">
          Search publishers
        </label>
        <Input
          id="publisher-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search by name, slug, URL, or handle"
          maxLength={MAX_QUERY_LEN}
          className="flex-1 min-w-56"
        />
        <Button type="submit" variant="primary">
          Search
        </Button>
        {query ? (
          <Link
            href="/admin/publishers"
            className={buttonClassName({ variant: "secondary" })}
          >
            Clear
          </Link>
        ) : null}
      </form>

      {publishers.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-[rgb(var(--color-fg-muted))]">
            {query
              ? `No publishers match "${query}".`
              : "No publishers in the catalog yet."}
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-2">
          {publishers.map((p) => (
            <li key={p.id}>
              <Card>
                <CardBody className="flex items-center gap-3">
                  <Avatar name={p.name} src={resolvePublisherLogoCandidates(p)} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/publishers/${p.slug}`}
                        className="font-medium hover:text-[rgb(var(--color-accent))]"
                      >
                        {p.name}
                      </Link>
                      <Pill
                        tone={p.type === "person" ? "type-person" : "type-company"}
                        size="sm"
                      >
                        {p.type === "person" ? "Person" : "Company"}
                      </Pill>
                      {p.isActive ? (
                        <Pill tone="success" size="sm">
                          Active
                        </Pill>
                      ) : (
                        <Pill tone="warning" size="sm">
                          Hidden
                        </Pill>
                      )}
                    </div>
                    <p className="text-xs text-[rgb(var(--color-fg-muted))] truncate">
                      {p.websiteUrl}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <Link
                      href={`/admin/publishers/${p.id}/edit`}
                      className={ROW_ACTION_CLASS}
                    >
                      Edit
                    </Link>
                    <form action={togglePublisherActiveAction} className="inline-flex">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={String(!p.isActive)} />
                      <button type="submit" className={ROW_ACTION_CLASS}>
                        {p.isActive ? "Hide" : "Activate"}
                      </button>
                    </form>
                    <DeletePublisherButton
                      action={deletePublisherAction}
                      publisherId={p.id}
                      publisherName={p.name}
                      className={ROW_ACTION_DANGER_CLASS}
                    />
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
