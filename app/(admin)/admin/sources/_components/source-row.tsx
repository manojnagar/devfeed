/**
 * @file Per-row admin controls for the /admin/sources page.
 *
 * Renders edit (inline form), hide/activate (toggle), and delete
 * (typed-confirm) for a single `BlogSource`. State for opening the
 * edit/delete drawers lives client-side so the surrounding page can
 * stay a Server Component. Form submissions go through the new
 * Server Actions (`updateSourceAction`, `setSourceActiveAction`,
 * `deleteSourceAction`) which re-validate every input behind
 * `requireAdmin()` and write to the audit log.
 *
 * The delete drawer asks the admin to type the literal string `DELETE`
 * because deleting a source cascades to every post + tag association
 * ingested by it (see migration 0002). Mirrors the GitHub repo-delete
 * confirmation pattern.
 */

"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteSourceAction,
  setSourceActiveAction,
  updateSourceAction,
  type SourceActionResult,
} from "../../actions";
import { TestFeedRowButton } from "./test-feed-panel";
import { Pill } from "@/components/ui/pill";
import { Input, Label, Select } from "@/components/ui/input";
import { relativeTime } from "@/lib/dates";
import type { BlogSource, SourceKind } from "@/lib/types";

const INITIAL: SourceActionResult | null = null;

export interface PublisherOption {
  id: string;
  name: string;
}

export interface SourceRowProps {
  source: BlogSource;
  publishers: PublisherOption[];
  publisherName: string | null;
}

function SubmitGhost({
  children,
  label,
  variant = "neutral",
}: {
  children: React.ReactNode;
  label: string;
  variant?: "neutral" | "danger";
}) {
  const { pending } = useFormStatus();
  const tone =
    variant === "danger"
      ? "text-[rgb(var(--color-danger))]"
      : "text-[rgb(var(--color-fg-muted))]";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className={`text-xs underline-offset-2 hover:underline disabled:opacity-50 ${tone}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

function ResultText({ state }: { state: SourceActionResult | null }) {
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

export function SourceRow({ source, publishers, publisherName }: SourceRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const healthy = source.consecutiveFailures === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral" size="sm">
          {source.kind.toUpperCase()}
        </Pill>
        <p className="font-medium truncate flex-1 min-w-[12ch]">
          {publisherName ?? source.publisherId}
        </p>
        {source.isActive ? (
          <Pill tone={healthy ? "success" : "danger"} size="sm">
            {healthy ? "Healthy" : `${source.consecutiveFailures} failures`}
          </Pill>
        ) : (
          <Pill tone="warning" size="sm">
            Hidden
          </Pill>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => {
              setTestOpen((v) => !v);
              setEditOpen(false);
              setDeleteOpen(false);
            }}
            className="text-xs text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))]"
            aria-expanded={testOpen}
            aria-controls={`test-${source.id}`}
          >
            {testOpen ? "Close test" : "Test"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditOpen((v) => !v);
              setDeleteOpen(false);
              setTestOpen(false);
            }}
            className="text-xs text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))]"
            aria-expanded={editOpen}
            aria-controls={`edit-${source.id}`}
          >
            {editOpen ? "Close edit" : "Edit"}
          </button>
          <ActiveToggleForm id={source.id} isActive={source.isActive} />
          <button
            type="button"
            onClick={() => {
              setDeleteOpen((v) => !v);
              setEditOpen(false);
              setTestOpen(false);
            }}
            className="text-xs text-[rgb(var(--color-danger))] hover:underline"
            aria-expanded={deleteOpen}
            aria-controls={`delete-${source.id}`}
          >
            {deleteOpen ? "Cancel delete" : "Delete"}
          </button>
        </div>
      </div>

      <p className="text-xs text-[rgb(var(--color-fg-muted))] truncate">{source.feedUrl}</p>

      <div className="text-xs text-[rgb(var(--color-fg-muted))] flex flex-wrap gap-3">
        {source.lastFetchedAt ? <span>Last fetched {relativeTime(source.lastFetchedAt)}</span> : null}
        {source.lastErrorMessage ? (
          <span className="text-[rgb(var(--color-danger))]">
            Last error: {source.lastErrorMessage}
          </span>
        ) : null}
      </div>

      {testOpen ? (
        <div
          id={`test-${source.id}`}
          className="rounded-md border border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] p-3 space-y-2"
        >
          <p className="text-xs text-[rgb(var(--color-fg-muted))]">
            Fetch the feed once and show what the parser sees. Doesn&apos;t change health status or
            ingest posts.
          </p>
          <TestFeedRowButton sourceId={source.id} />
        </div>
      ) : null}

      {editOpen ? (
        <EditForm
          id={`edit-${source.id}`}
          source={source}
          publishers={publishers}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteForm id={`delete-${source.id}`} sourceId={source.id} feedUrl={source.feedUrl} />
      ) : null}
    </div>
  );
}

function ActiveToggleForm({ id, isActive }: { id: string; isActive: boolean }) {
  const next = !isActive;
  return (
    <form action={setSourceActiveAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isActive" value={String(next)} />
      <SubmitButton label={isActive ? "Hide source" : "Activate source"}>
        {isActive ? "Hide" : "Activate"}
      </SubmitButton>
    </form>
  );
}

function SubmitButton({ children, label }: { children: React.ReactNode; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className="text-xs text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))] disabled:opacity-50"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function EditForm({
  id,
  source,
  publishers,
  onClose,
}: {
  id: string;
  source: BlogSource;
  publishers: PublisherOption[];
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(updateSourceAction, INITIAL);
  return (
    <form
      id={id}
      action={formAction}
      className="rounded-md border border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] p-3 grid sm:grid-cols-[1fr_2fr_120px_auto] gap-2 items-end"
    >
      <input type="hidden" name="id" value={source.id} />
      <div>
        <Label htmlFor={`publisher-${source.id}`}>Publisher</Label>
        <Select
          id={`publisher-${source.id}`}
          name="publisherId"
          defaultValue={source.publisherId}
          required
        >
          {publishers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`feed-${source.id}`}>Feed URL</Label>
        <Input
          id={`feed-${source.id}`}
          name="feedUrl"
          type="url"
          required
          defaultValue={source.feedUrl}
        />
      </div>
      <div>
        <Label htmlFor={`kind-${source.id}`}>Kind</Label>
        <Select
          id={`kind-${source.id}`}
          name="kind"
          defaultValue={source.kind satisfies SourceKind}
        >
          <option value="rss">RSS</option>
          <option value="atom">Atom</option>
          <option value="scrape">Scrape</option>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <SubmitGhost label={`Save changes to ${source.feedUrl}`}>Save</SubmitGhost>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[rgb(var(--color-fg-muted))] hover:underline"
        >
          Cancel
        </button>
      </div>
      <div className="sm:col-span-4">
        <ResultText state={state} />
      </div>
    </form>
  );
}

function DeleteForm({
  id,
  sourceId,
  feedUrl,
}: {
  id: string;
  sourceId: string;
  feedUrl: string;
}) {
  const [state, formAction] = useActionState(deleteSourceAction, INITIAL);
  return (
    <form
      id={id}
      action={formAction}
      className="rounded-md border border-[rgb(var(--color-danger))] bg-[rgb(var(--color-danger))]/[0.05] p-3 space-y-2"
    >
      <input type="hidden" name="id" value={sourceId} />
      <p className="text-xs text-[rgb(var(--color-fg))]">
        Permanently remove <span className="font-medium">{feedUrl}</span>. Every post ingested
        from this feed (and its tag associations) will be deleted. This can&apos;t be undone.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={`confirm-${sourceId}`} className="mb-0 text-xs">
          Type <code>DELETE</code> to confirm
        </Label>
        <Input
          id={`confirm-${sourceId}`}
          name="confirm"
          autoComplete="off"
          autoCapitalize="characters"
          required
          minLength={6}
          maxLength={6}
          pattern="DELETE"
          className="!w-32 !h-8 text-xs"
        />
        <SubmitGhost variant="danger" label={`Delete source ${feedUrl}`}>
          Delete source
        </SubmitGhost>
        <ResultText state={state} />
      </div>
    </form>
  );
}
