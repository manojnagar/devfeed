/**
 * @file Shared "Test feed" panel rendered both inline on existing-source
 * rows and on the Add-source form.
 *
 * - Wraps the `testFeedAction` Server Action with `useActionState` so the
 *   submitting form is a regular `<form action={…}>` while still
 *   surfacing the structured `TestFeedResult` (HTTP status, item count,
 *   sample titles) inline.
 * - Lives entirely client-side because `useActionState` needs `"use
 *   client"`. The page passes only the `sourceId` (or nothing — the
 *   Add-form variant reads `feedUrl` from the user-typed input).
 * - Renders nothing destructive: the action is a pure read against
 *   network + parser, so there is no destructive confirmation step.
 */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { testFeedAction, type TestFeedActionResult } from "../../actions";
import { absoluteDate } from "@/lib/dates";

const INITIAL: TestFeedActionResult | null = null;

export interface TestFeedPanelProps {
  /**
   * Existing source id — when set, the action ignores any `feedUrl`
   * input and re-uses the stored URL. Leave undefined for the Add form
   * variant which collects the URL from the visible input.
   */
  sourceId?: string;
  /**
   * Optional name attribute on the URL input. Used by the Add-form
   * variant so the parent form's existing `feedUrl` field doubles as
   * the test input — set this to the field's id and we'll mirror its
   * value via a hidden input on submit.
   */
  feedInputId?: string;
  /** Compact mode hides the heading; useful when stacked under the row. */
  compact?: boolean;
}

function TestSubmit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs px-2 py-1 rounded-md border border-[rgb(var(--color-line))] hover:border-[rgb(var(--color-accent))] hover:text-[rgb(var(--color-accent))] disabled:opacity-50"
    >
      {pending ? "Testing…" : children}
    </button>
  );
}

/**
 * The "for an existing source" flavor: just a button that submits the
 * stored sourceId; no URL input.
 */
export function TestFeedRowButton({ sourceId }: { sourceId: string }) {
  const [state, formAction] = useActionState(testFeedAction, INITIAL);
  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="sourceId" value={sourceId} />
      <TestSubmit>Test</TestSubmit>
      {state ? <TestResultRegion state={state} /> : null}
    </form>
  );
}

/**
 * The "before you add" flavor: a button rendered NEXT TO the Add form's
 * URL input. Reads the URL via a sibling hidden mirror on submit.
 *
 * Renders its own form so it doesn't accidentally submit the parent Add
 * form. We surface the result region right below the form (`region`
 * prop) so the test details flow into the Card body, not crammed
 * beneath the button.
 */
export function TestFeedAddForm({
  feedInputId,
}: {
  feedInputId: string;
}) {
  const [state, formAction] = useActionState(testFeedAction, INITIAL);
  return (
    <>
      <form
        action={formAction}
        className="contents"
        onSubmit={(event) => {
          // Mirror the visible URL input into our hidden field at submit time.
          const visible = document.getElementById(feedInputId) as
            | HTMLInputElement
            | null;
          const target = event.currentTarget as HTMLFormElement;
          const hidden = target.elements.namedItem("feedUrl") as
            | HTMLInputElement
            | null;
          if (visible && hidden) hidden.value = visible.value;
        }}
      >
        <input type="hidden" name="feedUrl" defaultValue="" />
        <TestSubmit>Test connection</TestSubmit>
      </form>
      {state ? (
        <div className="sm:col-span-4">
          <TestResultRegion state={state} />
        </div>
      ) : null}
    </>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${
        ok ? "bg-[rgb(var(--color-success))]" : "bg-[rgb(var(--color-danger))]"
      }`}
    />
  );
}

/**
 * Renders the structured test result. Pulled out so both variants share
 * identical formatting and the same `role="status"` semantics for
 * screen-reader announcements.
 */
function TestResultRegion({ state }: { state: TestFeedActionResult }) {
  const detail = state.detail;
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 rounded-md border border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] p-3 text-xs space-y-2"
    >
      <div className="flex items-center gap-2">
        <StatusDot ok={state.ok} />
        <span
          className={
            state.ok
              ? "font-medium text-[rgb(var(--color-success))]"
              : "font-medium text-[rgb(var(--color-danger))]"
          }
        >
          {state.ok ? "Feed reachable" : "Test failed"}
        </span>
        <span className="text-[rgb(var(--color-fg-muted))]">{state.message}</span>
      </div>

      {detail ? (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[rgb(var(--color-fg-muted))]">
          {detail.status !== null ? (
            <>
              <dt>HTTP</dt>
              <dd>{detail.status}</dd>
            </>
          ) : null}
          {detail.contentType ? (
            <>
              <dt>Content-Type</dt>
              <dd className="truncate">{detail.contentType}</dd>
            </>
          ) : null}
          {detail.finalUrl && detail.finalUrl !== detail.feedUrl ? (
            <>
              <dt>Resolved URL</dt>
              <dd className="truncate break-all">{detail.finalUrl}</dd>
            </>
          ) : null}
          <dt>Format</dt>
          <dd>
            {detail.isAtom === null
              ? "Unknown"
              : detail.isAtom
                ? "Atom"
                : "RSS"}
          </dd>
          <dt>Items parsed</dt>
          <dd>{detail.itemCount}</dd>
          <dt>Latency</dt>
          <dd>{detail.durationMs} ms</dd>
        </dl>
      ) : null}

      {detail?.warnings?.length ? (
        <ul className="list-disc pl-4 space-y-0.5 text-[rgb(var(--color-fg-muted))]">
          {detail.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {detail && detail.sampleItems.length > 0 ? (
        <div>
          <p className="font-medium text-[rgb(var(--color-fg))] mb-1">
            Latest items
          </p>
          <ol className="space-y-1 list-decimal pl-4">
            {detail.sampleItems.map((item) => (
              <li key={`${item.link}:${item.publishedAt}`} className="break-words">
                <span className="text-[rgb(var(--color-fg))]">{item.title}</span>
                <span className="text-[rgb(var(--color-fg-muted))]">
                  {" "}
                  · {absoluteDate(item.publishedAt)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
