/**
 * @file Builds the in-memory store contents from the seed data files.
 *
 * The output is plain TypeScript records — no DB writes happen here.
 * The caller (`lib/data/memory/store.ts`) drops the result into the
 * singleton store on first read.
 *
 * Output is fully deterministic: ids and timestamps are derived from
 * indexes + a fixed reference date so dev mode and tests behave the
 * same way every time.
 */

import { COMPANY_SEEDS } from "./companies";
import { PERSON_SEEDS } from "./people";
import { POST_TEMPLATES } from "./post-templates";
import { TAG_SEEDS } from "./tags";
import { shortHash, slugify } from "../../ids";
import { canonicalizeUrl } from "../../url";
import { sanitizePostBody } from "../../ingest/sanitize-body";
import type {
  AccessLabel,
  BlogSource,
  PaywallProvider,
  Post,
  PostTag,
  Profile,
  Publisher,
  Tag,
} from "../../types";

const REFERENCE_NOW = new Date("2026-04-25T09:00:00.000Z");

/** Make a stable id from a stable string — used so seeds are deterministic. */
function deterministicId(prefix: string, key: string): string {
  return `${prefix}-${shortHash(key)}`;
}

function inferPaywallProvider(websiteUrl: string): PaywallProvider {
  const host = new URL(websiteUrl).hostname.toLowerCase();
  if (host.includes("substack.com")) return "substack";
  if (host.includes("medium.com")) return "medium";
  if (host.includes("ghost.io")) return "ghost";
  if (host.includes("patreon.com")) return "patreon";
  return "unknown";
}

function buildPublishers(): Publisher[] {
  const companies: Publisher[] = COMPANY_SEEDS.map((seed) => ({
    id: deterministicId("pub", `company:${seed.slug}`),
    type: "company",
    slug: seed.slug,
    name: seed.name,
    websiteUrl: seed.websiteUrl,
    description: seed.description,
    logoUrl: null,
    twitterHandle: null,
    githubHandle: null,
    homeCountry: null,
    defaultAccessLabel: "free",
    defaultPaywallProvider: inferPaywallProvider(seed.websiteUrl),
    isVerified: false,
    isActive: true,
    createdAt: REFERENCE_NOW.toISOString(),
    updatedAt: REFERENCE_NOW.toISOString(),
  }));

  const people: Publisher[] = PERSON_SEEDS.map((seed) => ({
    id: deterministicId("pub", `person:${seed.slug}`),
    type: "person",
    slug: seed.slug,
    name: seed.name,
    websiteUrl: seed.websiteUrl,
    description: seed.description,
    logoUrl: null,
    twitterHandle: seed.twitterHandle,
    githubHandle: seed.githubHandle,
    homeCountry: null,
    defaultAccessLabel: "free",
    defaultPaywallProvider: inferPaywallProvider(seed.websiteUrl),
    isVerified: true,
    isActive: true,
    createdAt: REFERENCE_NOW.toISOString(),
    updatedAt: REFERENCE_NOW.toISOString(),
  }));

  return [...companies, ...people];
}

function buildBlogSources(publishers: Publisher[]): BlogSource[] {
  return publishers.map((p) => {
    const seed =
      COMPANY_SEEDS.find((c) => c.slug === p.slug) ??
      PERSON_SEEDS.find((c) => c.slug === p.slug);
    const feedUrl = seed?.feedUrl ?? `${p.websiteUrl.replace(/\/$/, "")}/feed`;
    return {
      id: deterministicId("src", `${p.slug}:primary`),
      publisherId: p.id,
      kind: "rss",
      feedUrl,
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: REFERENCE_NOW.toISOString(),
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: REFERENCE_NOW.toISOString(),
    } satisfies BlogSource;
  });
}

function buildTags(): Tag[] {
  return TAG_SEEDS.map((t) => ({
    id: deterministicId("tag", t.slug),
    slug: t.slug,
    name: t.name,
    description: t.description,
    isFeatured: t.featured,
  }));
}

interface PostBuild {
  posts: Post[];
  postTags: PostTag[];
}

function buildPostsFor(
  publisher: Publisher,
  source: BlogSource,
  tags: Tag[],
  startIndex: number,
): PostBuild {
  const posts: Post[] = [];
  const postTags: PostTag[] = [];
  const tagBySlug = new Map(tags.map((t) => [t.slug, t] as const));

  for (let i = 0; i < 3; i += 1) {
    const template = POST_TEMPLATES[(startIndex + i) % POST_TEMPLATES.length];
    const ageDays = (startIndex * 0.4 + i * 1.7) % 28;
    const publishedAt = new Date(REFERENCE_NOW.getTime() - ageDays * 86_400_000).toISOString();
    const titleSuffix = i === 0 ? "" : ` (part ${i + 1})`;
    const title = `${template.title}${titleSuffix}`;
    const slugPart = `${publisher.slug}-${slugify(title)}-${i}`;
    // Point the public canonical URL at a real, topical, public page
    // when the template provides one (`template.link` — typically a
    // Wikipedia article, vendor docs, or the SRE book chapter on the
    // same subject). When the template does not curate a link we fall
    // back to the publisher's blog index so the click at least lands
    // on a live page instead of a synthetic 404'd article slug.
    //
    // Either way we tack on `?devseed=…` so the canonical URL stays
    // unique per (publisher, template, i). The query param survives
    // `canonicalizeUrl()` (it isn't on the tracking-pattern allow-list)
    // and the well-known target hosts ignore unknown query params.
    //
    // In production with `STORAGE_ADAPTER=supabase` none of this runs
    // — `canonicalUrl` is overwritten by whatever the RSS feed item
    // advertises, which is the real per-article URL.
    const targetBase = (template.link ?? publisher.websiteUrl).replace(/\/$/, "");
    const sep = targetBase.includes("?") ? "&" : "?";
    const url = `${targetBase}${sep}devseed=${slugify(title)}-${i}`;
    const sampleBody = template.body ? sanitizePostBody(template.body) : "";
    const hasBody = sampleBody.length > 0;
    const post: Post = {
      id: deterministicId("post", slugPart),
      publisherId: publisher.id,
      sourceId: source.id,
      title,
      summary: template.summary,
      url,
      canonicalUrl: canonicalizeUrl(url),
      authorName: publisher.type === "person" ? publisher.name : null,
      publishedAt,
      readingTimeMin: template.readingTimeMin,
      accessLabel: template.accessLabel as AccessLabel,
      paywallProvider:
        template.accessLabel === "paid" ? publisher.defaultPaywallProvider : "unknown",
      thumbnailUrl: null,
      rawContentHash: shortHash(slugPart),
      bodyHtml: hasBody ? sampleBody : null,
      bodySource: hasBody ? "feed" : null,
      bodyExtractedAt: hasBody ? publishedAt : null,
      bodyFailedAt: null,
      bodyFailedReason: null,
      createdAt: publishedAt,
    };
    posts.push(post);
    for (const tagSlug of template.tagSlugs) {
      const tag = tagBySlug.get(tagSlug);
      if (tag) postTags.push({ postId: post.id, tagId: tag.id });
    }
  }
  return { posts, postTags };
}

function buildPosts(
  publishers: Publisher[],
  sources: BlogSource[],
  tags: Tag[],
): PostBuild {
  const allPosts: Post[] = [];
  const allPostTags: PostTag[] = [];
  let i = 0;
  for (const publisher of publishers) {
    const source = sources.find((s) => s.publisherId === publisher.id);
    if (!source) continue;
    const built = buildPostsFor(publisher, source, tags, i);
    allPosts.push(...built.posts);
    allPostTags.push(...built.postTags);
    i += 1;
  }
  return { posts: allPosts, postTags: allPostTags };
}

function buildAdminProfile(): Profile {
  return {
    userId: "demo-admin-user",
    email: "admin@devfeed.local",
    displayName: "Demo Admin",
    role: "admin",
    isBanned: false,
    createdAt: REFERENCE_NOW.toISOString(),
  };
}

function buildDemoUserProfile(): Profile {
  return {
    userId: "demo-user",
    email: "demo@devfeed.local",
    displayName: "Demo Reader",
    role: "user",
    isBanned: false,
    createdAt: REFERENCE_NOW.toISOString(),
  };
}

export interface SeedBuildOutput {
  publishers: Publisher[];
  blogSources: BlogSource[];
  tags: Tag[];
  posts: Post[];
  postTags: PostTag[];
  profiles: Profile[];
}

/** Returns the entire seeded dataset in one shot. */
export function buildSeed(): SeedBuildOutput {
  const publishers = buildPublishers();
  const blogSources = buildBlogSources(publishers);
  const tags = buildTags();
  const { posts, postTags } = buildPosts(publishers, blogSources, tags);
  const profiles = [buildDemoUserProfile(), buildAdminProfile()];
  return { publishers, blogSources, tags, posts, postTags, profiles };
}

export const SEED_REFERENCE_NOW = REFERENCE_NOW;
