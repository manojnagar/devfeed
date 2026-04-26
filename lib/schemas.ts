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
