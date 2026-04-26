/**
 * @file SuggestForm — client component that wires up the suggest action.
 *
 * Uses `useActionState` to bind to the server action and surface
 * field-level + global error messages.
 */

"use client";

import { useActionState } from "react";
import { Building2, User } from "lucide-react";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitSuggestionAction, type SuggestActionResult } from "../actions";

const INITIAL: SuggestActionResult | null = null;

export function SuggestForm() {
  const [state, formAction, isPending] = useActionState(submitSuggestionAction, INITIAL);
  const errors = state && !state.ok ? state.errors ?? {} : {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label>Publisher type</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <label className="flex items-center gap-2 cursor-pointer rounded-md border border-[rgb(var(--color-line-strong))] px-3 py-3 hover:bg-[rgb(var(--color-surface))]">
            <input
              type="radio"
              name="type"
              value="company"
              defaultChecked
              className="accent-[rgb(var(--color-accent))]"
            />
            <Building2 size={18} className="text-[rgb(var(--color-type-company))]" />
            <span className="text-sm font-medium">Company</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer rounded-md border border-[rgb(var(--color-line-strong))] px-3 py-3 hover:bg-[rgb(var(--color-surface))]">
            <input
              type="radio"
              name="type"
              value="person"
              className="accent-[rgb(var(--color-accent))]"
            />
            <User size={18} className="text-[rgb(var(--color-type-person))]" />
            <span className="text-sm font-medium">Person</span>
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Stripe Engineering"
          required
          aria-invalid={Boolean(errors["name"])}
        />
        <FieldError>{errors["name"]}</FieldError>
      </div>

      <div>
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          placeholder="https://stripe.com/blog"
          required
          aria-invalid={Boolean(errors["websiteUrl"])}
        />
        <FieldError>{errors["websiteUrl"]}</FieldError>
      </div>

      <div>
        <Label htmlFor="feedUrl">Feed URL (optional)</Label>
        <Input
          id="feedUrl"
          name="feedUrl"
          type="url"
          placeholder="https://stripe.com/blog/feed.rss"
          aria-invalid={Boolean(errors["feedUrl"])}
        />
        <FieldError>{errors["feedUrl"]}</FieldError>
      </div>

      <div>
        <Label htmlFor="reason">Why you recommend it (optional)</Label>
        <Textarea id="reason" name="reason" rows={3} placeholder="Deep technical posts on payments infrastructure." />
        <FieldError>{errors["reason"]}</FieldError>
      </div>

      {state && !state.ok && state.message ? (
        <p
          role="alert"
          className="text-sm text-[rgb(var(--color-danger))] bg-[rgb(var(--color-danger))]/10 rounded-md px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="primary" loading={isPending} className="w-full">
        Submit suggestion
      </Button>
    </form>
  );
}
