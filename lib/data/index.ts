/**
 * @file Repository factory.
 *
 * The single entry point the rest of the codebase imports. Returns the
 * Repository implementation chosen by `STORAGE_ADAPTER`. Callers use:
 *
 *   import { getRepository } from "@/lib/data";
 *   const repo = getRepository();
 *   const posts = await repo.posts.list({ ... });
 */

import { getEnv } from "../env";
import type { Repository } from "./types";
import { memoryRepository } from "./memory/repository";
import { supabaseRepository } from "./supabase/repository";

let cached: Repository | null = null;

/** Returns the active Repository, memoised after first call. */
export function getRepository(): Repository {
  if (cached) return cached;
  const env = getEnv();
  cached = env.STORAGE_ADAPTER === "supabase" ? supabaseRepository : memoryRepository;
  return cached;
}

/** Test-only — drop the cached repo so tests can force a re-resolution. */
export function __resetRepositoryCache(): void {
  cached = null;
}

export type { Repository } from "./types";
