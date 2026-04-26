/**
 * @file Aggregates the in-memory per-entity repos into one Repository.
 *
 * Composition only — no business logic lives here. Each entity-specific
 * implementation is in `./repos/<name>.ts`.
 */

import type { Repository } from "../types";
import { memoryBlogSourceRepo } from "./repos/blog-sources";
import { memoryBookmarkRepo } from "./repos/bookmarks";
import { memoryDigestRepo } from "./repos/digest";
import { memoryFollowRepo } from "./repos/follows";
import { memoryPostRepo } from "./repos/posts";
import { memoryProfileRepo } from "./repos/profiles";
import { memoryPublisherRepo } from "./repos/publishers";
import { memoryAuditRepo, memoryReadEventRepo } from "./repos/read-events";
import { memorySuggestionRepo } from "./repos/suggestions";
import { memoryTagRepo } from "./repos/tags";

export const memoryRepository: Repository = {
  publishers: memoryPublisherRepo,
  blogSources: memoryBlogSourceRepo,
  posts: memoryPostRepo,
  tags: memoryTagRepo,
  profiles: memoryProfileRepo,
  bookmarks: memoryBookmarkRepo,
  follows: memoryFollowRepo,
  digest: memoryDigestRepo,
  suggestions: memorySuggestionRepo,
  readEvents: memoryReadEventRepo,
  audit: memoryAuditRepo,
};
