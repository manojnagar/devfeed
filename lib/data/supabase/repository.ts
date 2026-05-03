/**
 * @file Aggregates the per-entity Supabase repos into one Repository.
 *
 * Composition only — no business logic lives here. Each entity-specific
 * implementation is in `./repos/<name>.ts`. Mirrors the in-memory
 * adapter's structure (`./memory/repository.ts`) so the two stay
 * symmetric and easy to compare side-by-side.
 *
 * Every method writes through the service-role client (see
 * `./repos/*.ts`) and re-enforces auth at the application layer
 * (`requireUser` / `requireAdmin` in `lib/auth/*`). The
 * data-and-storage-security workspace rule applies — never let a
 * service-role write happen without an explicit application-level
 * authorization check upstream.
 */

import type { Repository } from "../types";
import { supabaseBlogSourceRepo } from "./repos/blog-sources";
import { supabaseBookmarkRepo } from "./repos/bookmarks";
import { supabaseDigestRepo } from "./repos/digest";
import { supabaseFollowRepo } from "./repos/follows";
import { supabasePostRepo } from "./repos/posts";
import { supabaseProfileRepo } from "./repos/profiles";
import { supabasePublisherRepo } from "./repos/publishers";
import { supabaseAuditRepo, supabaseReadEventRepo } from "./repos/read-events";
import { supabaseSuggestionRepo } from "./repos/suggestions";
import { supabaseTagRepo } from "./repos/tags";

export const supabaseRepository: Repository = {
  publishers: supabasePublisherRepo,
  blogSources: supabaseBlogSourceRepo,
  posts: supabasePostRepo,
  tags: supabaseTagRepo,
  profiles: supabaseProfileRepo,
  bookmarks: supabaseBookmarkRepo,
  follows: supabaseFollowRepo,
  digest: supabaseDigestRepo,
  suggestions: supabaseSuggestionRepo,
  readEvents: supabaseReadEventRepo,
  audit: supabaseAuditRepo,
};

/**
 * Retained from the previous scaffolding so any caller still importing
 * the named export keeps building. Not thrown by any method now.
 */
export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`Supabase adapter method '${method}' is not implemented yet.`);
    this.name = "NotImplementedError";
  }
}
