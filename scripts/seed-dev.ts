/**
 * @file Local-only seed runner.
 *
 * The in-memory store builds itself on first read, so this script is
 * mainly a convenience for verifying the seed graph (counts, samples,
 * relationships) outside of a Vitest run.
 *
 * For production seeding, use the SQL files in `lib/data/sql/` along
 * with the Supabase CLI (see `docs/SETUP.md`).
 */

import { resetMemoryStore } from "../lib/data/memory/store";
import { __resetRepositoryCache, getRepository } from "../lib/data";

async function main(): Promise<void> {
  resetMemoryStore();
  __resetRepositoryCache();
  const repo = getRepository();
  const [publishers, posts, tags] = await Promise.all([
    repo.publishers.list(),
    repo.posts.list({ pageSize: 1000 }),
    repo.tags.list(),
  ]);
  const companies = publishers.filter((p) => p.type === "company");
  const people = publishers.filter((p) => p.type === "person");
  console.log("Seed summary");
  console.log(`  publishers: ${publishers.length} (companies=${companies.length}, people=${people.length})`);
  console.log(`  tags:       ${tags.length}`);
  console.log(`  posts:      ${posts.total}`);
  console.log("\nSample publishers:");
  for (const p of publishers.slice(0, 5)) {
    console.log(`  - ${p.type.padEnd(7)} ${p.slug.padEnd(28)} ${p.name}`);
  }
  console.log("\nSample posts:");
  for (const p of posts.items.slice(0, 5)) {
    console.log(`  - ${p.publisher.slug.padEnd(28)} ${p.title.slice(0, 60)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
