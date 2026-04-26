/**
 * @file Repository contracts.
 *
 * Defines every read/write operation the UI + ingestion + cron jobs
 * need against the data layer. Both the in-memory adapter (used in dev
 * mode + tests) and the Supabase adapter (used in production) implement
 * these interfaces — application code should never import from a
 * specific adapter.
 *
 * Splitting by entity (`PublisherRepository`, `PostRepository`, …)
 * keeps each method group small and easy to mock in tests.
 */

import type {
  AccessLabel,
  AuditLog,
  Bookmark,
  BlogSource,
  DigestPreferences,
  FollowedPublisher,
  FollowedTag,
  Page,
  Post,
  PostWithRelations,
  Profile,
  Publisher,
  PublisherSuggestion,
  PublisherType,
  ReadEvent,
  SuggestionStatus,
  Tag,
  UserRole,
} from "../types";
import type { FilterQuery } from "../schemas";

export interface ListPostsOptions extends Partial<FilterQuery> {
  pageSize?: number;
  followedPublisherIds?: string[];
  followedTagIds?: string[];
}

export interface PublisherRepository {
  list(options?: { type?: PublisherType[]; isActive?: boolean }): Promise<Publisher[]>;
  getBySlug(slug: string): Promise<Publisher | null>;
  getById(id: string): Promise<Publisher | null>;
  upsert(publisher: Publisher): Promise<Publisher>;
  setActive(id: string, isActive: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface BlogSourceRepository {
  listByPublisher(publisherId: string): Promise<BlogSource[]>;
  listActive(): Promise<BlogSource[]>;
  upsert(source: BlogSource): Promise<BlogSource>;
  recordSuccess(sourceId: string, fetchedAt: string): Promise<void>;
  recordFailure(sourceId: string, message: string, occurredAt: string): Promise<void>;
}

export interface PostRepository {
  list(options: ListPostsOptions): Promise<Page<PostWithRelations>>;
  getById(id: string): Promise<PostWithRelations | null>;
  getByCanonicalUrl(canonicalUrl: string): Promise<Post | null>;
  insertMany(posts: Post[]): Promise<number>;
  attachTags(postId: string, tagIds: string[]): Promise<void>;
  trendingTop(limit: number, days: number): Promise<PostWithRelations[]>;
}

export interface TagRepository {
  list(options?: { featuredOnly?: boolean }): Promise<Tag[]>;
  getBySlug(slug: string): Promise<Tag | null>;
  upsertMany(tags: Tag[]): Promise<Tag[]>;
  matchByKeywords(text: string): Promise<Tag[]>;
  merge(sourceId: string, targetId: string): Promise<void>;
}

export interface ProfileRepository {
  getById(userId: string): Promise<Profile | null>;
  upsert(profile: Profile): Promise<Profile>;
  setRole(userId: string, role: UserRole): Promise<void>;
  setBanned(userId: string, isBanned: boolean): Promise<void>;
  list(options?: { role?: UserRole }): Promise<Profile[]>;
}

export interface BookmarkRepository {
  listForUser(userId: string): Promise<PostWithRelations[]>;
  toggle(userId: string, postId: string): Promise<{ bookmarked: boolean }>;
  has(userId: string, postId: string): Promise<boolean>;
  bulkHas(userId: string, postIds: string[]): Promise<Set<string>>;
  raw(userId: string): Promise<Bookmark[]>;
}

export interface FollowRepository {
  listFollowedPublishers(userId: string): Promise<Publisher[]>;
  listFollowedTags(userId: string): Promise<Tag[]>;
  togglePublisher(userId: string, publisherId: string): Promise<{ followed: boolean }>;
  toggleTag(userId: string, tagId: string): Promise<{ followed: boolean }>;
  rawPublishers(userId: string): Promise<FollowedPublisher[]>;
  rawTags(userId: string): Promise<FollowedTag[]>;
}

export interface DigestRepository {
  getPreferences(userId: string): Promise<DigestPreferences>;
  setPreferences(prefs: DigestPreferences): Promise<DigestPreferences>;
  selectRecipients(now: Date): Promise<DigestPreferences[]>;
  recordSent(userId: string, sentAt: string, postIds: string[]): Promise<void>;
}

export interface SuggestionRepository {
  listForUser(userId: string): Promise<PublisherSuggestion[]>;
  listByStatus(status: SuggestionStatus): Promise<PublisherSuggestion[]>;
  getById(id: string): Promise<PublisherSuggestion | null>;
  insert(suggestion: PublisherSuggestion): Promise<PublisherSuggestion>;
  countPendingForUser(userId: string): Promise<number>;
  countLastWeekForUser(userId: string): Promise<number>;
  decide(
    suggestionId: string,
    decision: SuggestionStatus,
    reviewerId: string,
    reviewerNotes: string | null,
  ): Promise<PublisherSuggestion>;
}

export interface ReadEventRepository {
  insert(event: ReadEvent): Promise<void>;
  countTotal(): Promise<number>;
  countByDay(days: number): Promise<Array<{ day: string; count: number }>>;
  countByPublisher(days: number, limit: number): Promise<Array<{ publisherId: string; count: number }>>;
  countByAccess(days: number): Promise<Array<{ accessLabel: AccessLabel; count: number }>>;
}

export interface AuditRepository {
  insert(entry: AuditLog): Promise<void>;
  list(limit: number): Promise<AuditLog[]>;
}

export interface Repository {
  publishers: PublisherRepository;
  blogSources: BlogSourceRepository;
  posts: PostRepository;
  tags: TagRepository;
  profiles: ProfileRepository;
  bookmarks: BookmarkRepository;
  follows: FollowRepository;
  digest: DigestRepository;
  suggestions: SuggestionRepository;
  readEvents: ReadEventRepository;
  audit: AuditRepository;
}
