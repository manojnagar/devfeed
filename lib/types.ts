/**
 * @file Domain types shared across server + client code.
 *
 * Mirrors the Postgres schema in `supabase/migrations/0001_init.sql` —
 * keep them in sync. Enums are declared as union literal types so they
 * round-trip cleanly through JSON and serve as discriminators in
 * pattern matching (e.g. `publisher.type === "person"`).
 */

export type PublisherType = "company" | "person";
export type AccessLabel = "free" | "paid" | "members_only" | "mixed";
export type PaywallProvider = "substack" | "ghost" | "medium" | "patreon" | "unknown";
export type SuggestionStatus = "pending" | "approved" | "rejected" | "needs_changes";
export type DigestFrequency = "off" | "daily" | "weekly";
export type SourceKind = "rss" | "atom" | "scrape";
export type UserRole = "user" | "admin";

/** A blog publisher — a company engineering blog or an individual author site. */
export interface Publisher {
  id: string;
  type: PublisherType;
  slug: string;
  name: string;
  websiteUrl: string;
  description: string | null;
  logoUrl: string | null;
  twitterHandle: string | null;
  githubHandle: string | null;
  homeCountry: string | null;
  defaultAccessLabel: AccessLabel;
  defaultPaywallProvider: PaywallProvider;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A feed source attached to a publisher (1+ per publisher in production). */
export interface BlogSource {
  id: string;
  publisherId: string;
  kind: SourceKind;
  feedUrl: string;
  scrapeConfig: { selector?: string; baseUrl?: string } | null;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
  createdAt: string;
}

/** Where a post body was sourced from. See migration 0006. */
export type PostBodySource = "feed" | "extracted";

/** A single article ingested from a blog source. */
export interface Post {
  id: string;
  publisherId: string;
  sourceId: string;
  title: string;
  summary: string | null;
  url: string;
  canonicalUrl: string;
  authorName: string | null;
  publishedAt: string;
  readingTimeMin: number | null;
  accessLabel: AccessLabel;
  paywallProvider: PaywallProvider;
  thumbnailUrl: string | null;
  rawContentHash: string | null;
  /** Sanitized HTML body for the inline reader, or null until populated. */
  bodyHtml: string | null;
  /** Where `bodyHtml` came from: feed `<content:encoded>` or on-demand extraction. */
  bodySource: PostBodySource | null;
  /** When `bodyHtml` was last populated. */
  bodyExtractedAt: string | null;
  /** When extraction last failed (used for cool-off). */
  bodyFailedAt: string | null;
  /** Short reason for the last extraction failure. */
  bodyFailedReason: string | null;
  createdAt: string;
}

/** A normalised topic/technology label. */
export interface Tag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isFeatured: boolean;
}

/** A many-to-many link between a post and a tag. */
export interface PostTag {
  postId: string;
  tagId: string;
}

/** The application-side mirror of `auth.users` plus role + display fields. */
export interface Profile {
  userId: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  isBanned: boolean;
  createdAt: string;
}

export interface Bookmark {
  userId: string;
  postId: string;
  createdAt: string;
}

export interface FollowedPublisher {
  userId: string;
  publisherId: string;
  createdAt: string;
}

export interface FollowedTag {
  userId: string;
  tagId: string;
  createdAt: string;
}

export interface DigestPreferences {
  userId: string;
  frequency: DigestFrequency;
  preferredHourUtc: number;
  includeFollowedPublishers: boolean;
  includeFollowedTags: boolean;
  includeAccessLabels: AccessLabel[];
  maxPostsPerEmail: number;
  lastSentAt: string | null;
}

/** A user-suggested publisher pending admin moderation. */
export interface PublisherSuggestion {
  id: string;
  submittedByUserId: string;
  type: PublisherType;
  name: string;
  websiteUrl: string;
  feedUrl: string | null;
  feedKind: SourceKind | null;
  reason: string | null;
  autoValidation: {
    rssDetected: boolean;
    rssUrl: string | null;
    httpStatus: number | null;
    inferredAccess: AccessLabel | null;
    notes: string[];
  } | null;
  status: SuggestionStatus;
  reviewedByUserId: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A read-event row for analytics. IP + UA are hashed before insert. */
export interface ReadEvent {
  id: string;
  postId: string;
  userId: string | null;
  anonId: string | null;
  ipHash: string | null;
  uaHash: string | null;
  referrer: string | null;
  occurredAt: string;
}

/** An immutable audit row written for every admin write. */
export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

/** A fully-hydrated post for list rendering. */
export interface PostWithRelations extends Post {
  publisher: Publisher;
  tags: Tag[];
}

/** Paginated query result. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
