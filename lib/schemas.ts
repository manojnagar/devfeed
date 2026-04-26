/**
 * @file Zod schemas for validated input at every trust boundary.
 *
 * Every Server Action, Route Handler, and form submission must parse
 * incoming data through one of these schemas. Per the workspace
 * data-and-storage-security rule, validation is the first line of
 * defence before anything reaches the data layer.
 */

import { z } from "zod";

export const PublisherTypeEnum = z.enum(["company", "person"]);
export const AccessLabelEnum = z.enum(["free", "paid", "members_only", "mixed"]);
export const SuggestionStatusEnum = z.enum(["pending", "approved", "rejected", "needs_changes"]);
export const SourceKindEnum = z.enum(["rss", "atom", "scrape"]);
export const DigestFrequencyEnum = z.enum(["off", "daily", "weekly"]);
export const UserRoleEnum = z.enum(["user", "admin"]);

export const SetUserRoleSchema = z.object({
  userId: z.string().min(1).max(200),
  role: UserRoleEnum,
});

export const SetUserBannedSchema = z.object({
  userId: z.string().min(1).max(200),
  isBanned: z.boolean(),
});

export const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers and hyphens only");

export const UrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((u) => /^https?:\/\//i.test(u), "Only http(s) URLs are allowed");

/** Trimmed identifier for any blog source the admin acts on. */
export const SourceIdSchema = z.object({
  id: z.string().trim().min(1).max(200),
});

/**
 * Update an existing blog source's mutable fields. Audit/health columns
 * (`last_*`, `consecutive_failures`) are updated by the ingest cron, not
 * via this admin action.
 */
export const UpdateSourceSchema = z.object({
  id: z.string().trim().min(1).max(200),
  publisherId: z.string().trim().min(1).max(200),
  feedUrl: UrlSchema,
  kind: SourceKindEnum,
});

export const SetSourceActiveSchema = z.object({
  id: z.string().trim().min(1).max(200),
  isActive: z.boolean(),
});

/**
 * Inputs for the admin "Test feed" dry-run.
 *
 * At least one of `feedUrl` (free-form, used by the pre-save tester on
 * the Add form) or `sourceId` (used by the per-row tester) must be
 * provided. When both are submitted the action layer prefers
 * `sourceId` and resolves the stored URL — that way an admin can't
 * smuggle a different URL into a known source's audit trail by
 * crafting a request directly.
 */
export const TestFeedSchema = z
  .object({
    feedUrl: UrlSchema.optional(),
    sourceId: z.string().trim().min(1).max(200).optional(),
  })
  .refine((v) => Boolean(v.feedUrl) || Boolean(v.sourceId), {
    message: "Provide a feed URL or pick an existing source.",
  });

export const PublisherSuggestionInputSchema = z.object({
  type: PublisherTypeEnum,
  name: z.string().trim().min(2).max(120),
  websiteUrl: UrlSchema,
  feedUrl: UrlSchema.optional().nullable(),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const SuggestionDecisionSchema = z.object({
  suggestionId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "needs_changes"]),
  reviewerNotes: z.string().max(1000).optional().nullable(),
});

export const DigestPreferencesInputSchema = z.object({
  frequency: DigestFrequencyEnum,
  preferredHourUtc: z.number().int().min(0).max(23),
  includeFollowedPublishers: z.boolean(),
  includeFollowedTags: z.boolean(),
  includeAccessLabels: z.array(AccessLabelEnum).min(1),
  maxPostsPerEmail: z.number().int().min(1).max(50),
});

export const FilterQuerySchema = z.object({
  type: z
    .string()
    .optional()
    .transform((v) => (v ? (v.split(",").filter(Boolean) as Array<"company" | "person">) : [])),
  publisher: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : [])),
  tag: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : [])),
  access: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? (v.split(",").filter(Boolean) as Array<"free" | "paid" | "members_only" | "mixed">)
        : [],
    ),
  q: z.string().trim().max(120).optional(),
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((v) => v === null || (v instanceof Date && !Number.isNaN(v.getTime())), {
      message: "Invalid 'from' date",
    }),
  sort: z.enum(["newest", "trending"]).default("newest").optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
});

export type FilterQuery = z.infer<typeof FilterQuerySchema>;
export type PublisherSuggestionInput = z.infer<typeof PublisherSuggestionInputSchema>;
export type SuggestionDecision = z.infer<typeof SuggestionDecisionSchema>;
export type DigestPreferencesInput = z.infer<typeof DigestPreferencesInputSchema>;
