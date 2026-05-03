/**
 * @file Shared form for creating + editing a publisher.
 *
 * Both `/admin/publishers/new` and `/admin/publishers/[id]/edit` render
 * this server component; the only difference is whether `publisher` is
 * provided. The slug is intentionally non-editable (passed as a hidden
 * input on edit) — renaming a slug breaks bookmarks and inbound links,
 * so the safe path is delete + recreate.
 */

import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  resolvePublisherLogo,
  resolvePublisherLogoCandidates,
} from "@/lib/publisher-logo";
import type { Publisher } from "@/lib/types";

export interface PublisherFormProps {
  /** Server Action invoked on submit. Same handler for create + edit. */
  action: (formData: FormData) => Promise<void> | void;
  /** When provided the form pre-fills its inputs and operates as edit. */
  publisher?: Publisher;
  /** Override the default submit label. */
  submitLabel?: string;
}

export function PublisherForm({ action, publisher, submitLabel }: PublisherFormProps) {
  const isEdit = Boolean(publisher);
  return (
    <Card>
      <CardBody>
        <form action={action} className="space-y-4">
          {isEdit ? (
            <>
              <input type="hidden" name="id" value={publisher!.id} />
              <input type="hidden" name="slug" value={publisher!.slug} />
            </>
          ) : null}

          {isEdit ? (
            <div className="flex items-center gap-3 rounded-md border border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] p-3">
              <Avatar
                name={publisher!.name}
                src={resolvePublisherLogoCandidates(publisher!)}
                size={48}
              />
              <div className="min-w-0 text-sm">
                <p className="font-medium truncate">{publisher!.name}</p>
                <p className="text-xs text-[rgb(var(--color-fg-muted))] truncate">
                  /publishers/{publisher!.slug} · {publisher!.isActive ? "Active" : "Hidden"}
                </p>
              </div>
            </div>
          ) : null}

          <div>
            <Label htmlFor="type">Type</Label>
            <Select id="type" name="type" defaultValue={publisher?.type ?? "company"}>
              <option value="company">Company</option>
              <option value="person">Person</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={publisher?.name ?? ""}
              required
              minLength={2}
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              defaultValue={publisher?.websiteUrl ?? ""}
              required
              maxLength={2048}
            />
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              // Only the *explicit* admin override is loaded into the
              // input. Pre-filling with an auto-derived URL would force
              // it to be saved as an explicit override on Save, which
              // collapses the runtime fallback chain to a single URL —
              // a regression compared to the auto-resolver.
              defaultValue={publisher?.logoUrl ?? ""}
              placeholder={
                resolvePublisherLogo(publisher ?? { logoUrl: null, websiteUrl: "" }) ??
                "https://example.com/logo.png"
              }
              maxLength={2048}
            />
            <p className="mt-1 text-xs text-[rgb(var(--color-fg-muted))]">
              Optional override. Leave blank to auto-resolve from the
              website above — the Avatar tries
              <code className="mx-1 rounded bg-[rgb(var(--color-surface))] px-1 text-[11px]">
                /apple-touch-icon.png
              </code>
              then
              <code className="mx-1 rounded bg-[rgb(var(--color-surface))] px-1 text-[11px]">
                /favicon.ico
              </code>
              (and the apex domain for subdomain blogs), falling back to
              colored initials if every candidate fails. Square images
              render best (≥ 64×64).
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={publisher?.description ?? ""}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="twitterHandle">Twitter handle</Label>
              <Input
                id="twitterHandle"
                name="twitterHandle"
                defaultValue={publisher?.twitterHandle ?? ""}
                placeholder="stripe"
                maxLength={50}
              />
            </div>
            <div>
              <Label htmlFor="githubHandle">GitHub handle</Label>
              <Input
                id="githubHandle"
                name="githubHandle"
                defaultValue={publisher?.githubHandle ?? ""}
                placeholder="stripe"
                maxLength={50}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="defaultAccessLabel">Default access label</Label>
            <Select
              id="defaultAccessLabel"
              name="defaultAccessLabel"
              defaultValue={publisher?.defaultAccessLabel ?? "free"}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="members_only">Members only</option>
              <option value="mixed">Mixed</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" variant="primary">
              {submitLabel ?? (isEdit ? "Save changes" : "Create")}
            </Button>
            <Link
              href="/admin/publishers"
              className={buttonClassName({ variant: "secondary" })}
            >
              Cancel
            </Link>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
