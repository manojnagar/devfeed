/**
 * @file Inline "Delete" trigger + verification dialog for the admin
 * publishers list.
 *
 * UX intent
 * ---------
 * The native `window.confirm()` is too easy to dismiss with `Enter`
 * (browsers focus the OK button by default). For a destructive
 * cascading delete we want a "make-me-think-twice" gate:
 *
 *   1. Click `Delete` → opens an in-app modal (not a browser dialog).
 *   2. The modal lists the consequences (posts + sources + follows
 *      + bookmarks + read events all gone).
 *   3. The Confirm button stays disabled until the admin types the
 *      publisher's exact display name into the verification input
 *      (case-sensitive — same pattern as GitHub's repo-delete UI).
 *   4. Submitting POSTs to the Server Action with `confirm=DELETE`
 *      so the server-side defense-in-depth check still passes.
 *
 * Defense in depth
 * ----------------
 * The server Action (`deletePublisherAction`) re-validates the typed
 * confirmation token via zod (`confirm: z.literal("DELETE")`), so even
 * a forged or stale form post that bypasses this dialog is rejected
 * unless the token is present. The dialog adds the human gate; the
 * server enforces the contract.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface DeletePublisherButtonProps {
  /** The Server Action to invoke once the dialog is confirmed. */
  action: (formData: FormData) => Promise<void> | void;
  publisherId: string;
  publisherName: string;
  /** Optional override for the trigger button's tailwind classes. */
  className?: string;
}

const TRIGGER_CLASS_DEFAULT =
  "inline-flex items-center text-xs font-medium leading-none text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-danger))] transition-colors";

export function DeletePublisherButton({
  action,
  publisherId,
  publisherName,
  className,
}: DeletePublisherButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? TRIGGER_CLASS_DEFAULT}
      >
        Delete
      </button>
      {open ? (
        <DeletePublisherDialog
          action={action}
          publisherId={publisherId}
          publisherName={publisherName}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

interface DialogProps {
  action: (formData: FormData) => Promise<void> | void;
  publisherId: string;
  publisherName: string;
  onClose: () => void;
}

function DeletePublisherDialog({
  action,
  publisherId,
  publisherName,
  onClose,
}: DialogProps) {
  const [typed, setTyped] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  const matches = typed === publisherName;

  React.useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  React.useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.key === "Escape" && !submitting) {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, submitting]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    if (!matches) {
      event.preventDefault();
      return;
    }
    setSubmitting(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="document"
        className={cn(
          "relative w-full max-w-md rounded-lg border border-[rgb(var(--color-line))]",
          "bg-[rgb(var(--color-surface-elevated))] shadow-xl",
        )}
      >
        <form action={action} onSubmit={handleSubmit}>
          <input type="hidden" name="id" value={publisherId} />
          <input type="hidden" name="confirm" value="DELETE" />

          <div className="px-5 pt-5 pb-3">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[rgb(var(--color-fg))]"
            >
              Delete publisher?
            </h2>
            <p
              id={descId}
              className="mt-2 text-sm text-[rgb(var(--color-fg-muted))]"
            >
              This will permanently remove{" "}
              <span className="font-medium text-[rgb(var(--color-fg))]">
                {publisherName}
              </span>
              , along with all of its posts, feed sources, follows, bookmarks,
              and read events.{" "}
              <span className="font-medium text-[rgb(var(--color-danger))]">
                This cannot be undone.
              </span>
            </p>
          </div>

          <div className="px-5 pb-5 space-y-2">
            <label
              htmlFor={`${titleId}-confirm`}
              className="block text-sm text-[rgb(var(--color-fg))]"
            >
              To confirm, type the publisher name{" "}
              <code className="rounded bg-[rgb(var(--color-surface))] px-1.5 py-0.5 text-xs font-medium text-[rgb(var(--color-fg))]">
                {publisherName}
              </code>{" "}
              below:
            </label>
            <input
              ref={inputRef}
              id={`${titleId}-confirm`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              aria-invalid={typed.length > 0 && !matches}
              className={cn(
                "h-10 w-full rounded-md border bg-[rgb(var(--color-surface))]",
                "px-3 text-sm outline-none transition",
                "border-[rgb(var(--color-line-strong))]",
                "focus:border-[rgb(var(--color-accent))] focus:ring-2 focus:ring-[rgb(var(--color-accent))]/30",
                typed.length > 0 && !matches
                  ? "border-[rgb(var(--color-danger))] focus:border-[rgb(var(--color-danger))] focus:ring-[rgb(var(--color-danger))]/30"
                  : null,
              )}
            />
            {typed.length > 0 && !matches ? (
              <p className="text-xs text-[rgb(var(--color-danger))]">
                The text doesn&apos;t match. Type{" "}
                <span className="font-medium">{publisherName}</span> exactly.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 rounded-b-lg border-t border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] px-5 py-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors",
                "bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-fg))]",
                "border border-[rgb(var(--color-line-strong))] hover:bg-[rgb(var(--color-surface))]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!matches || submitting}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors",
                "bg-[rgb(var(--color-danger))] text-white hover:opacity-90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {submitting ? "Deleting…" : "Delete publisher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
