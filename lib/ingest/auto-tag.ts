/**
 * @file Keyword-based auto-tagger.
 *
 * Walks the seed tag list and returns the ids of tags whose keywords
 * appear (case-insensitive) in the title + summary. The full keyword
 * dictionary lives in `lib/data/seed/tags.ts` so editors don't need to
 * touch this file when refining the auto-tag rules.
 */

import { TAG_SEEDS, type TagSeed } from "../data/seed/tags";

export interface AutoTagInput {
  title: string;
  summary?: string | null;
}

export interface AutoTagOutput {
  slugs: string[];
}

/** Return the slugs of tags whose keywords appear in the input. */
export function autoTag(input: AutoTagInput, dictionary: TagSeed[] = TAG_SEEDS): AutoTagOutput {
  const haystack = `${input.title} ${input.summary ?? ""}`.toLowerCase();
  const matched: string[] = [];
  for (const seed of dictionary) {
    if (seed.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      matched.push(seed.slug);
    }
  }
  return { slugs: matched };
}
