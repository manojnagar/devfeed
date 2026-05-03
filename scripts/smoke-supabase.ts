/**
 * @file Smoke test for the Supabase repository adapter.
 *
 * Exercises every read method (and an optional set of safe write
 * methods) against the configured Supabase project. Run with:
 *
 *   STORAGE_ADAPTER=supabase \
 *   NEXT_PUBLIC_SUPABASE_URL=...     \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=...    \
 *   npx tsx scripts/smoke-supabase.ts
 *
 * Add `--writes` to exercise idempotent write paths too. By default
 * only read paths run, so the script is safe to point at production.
 *
 * Output is tabular pass/fail per method. Exit code is non-zero if any
 * check fails, so this can also be wired into CI.
 *
 * Per the workspace `data-and-storage-security` rule, this script
 * never logs full row contents or any value that could include PII —
 * only counts, ids of seeded fixtures, and error messages. Set
 * SUPABASE_SERVICE_ROLE_KEY only via the env, never inline.
 */

import { randomUUID } from "node:crypto";
import { getEnv } from "../lib/env";
import { getRepository } from "../lib/data";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

async function timed<T>(
  name: string,
  fn: () => Promise<{ ok: boolean; detail: string }>,
): Promise<CheckResult> {
  const started = Date.now();
  try {
    const { ok, detail } = await fn();
    return { name, ok, detail, ms: Date.now() - started };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { name, ok: false, detail, ms: Date.now() - started };
  }
}

async function runReadChecks(): Promise<CheckResult[]> {
  const repo = getRepository();
  const checks: CheckResult[] = [];

  checks.push(
    await timed("publishers.list({isActive:true})", async () => {
      const all = await repo.publishers.list({ isActive: true });
      return { ok: true, detail: `${all.length} active publishers` };
    }),
  );
  checks.push(
    await timed("publishers.getBySlug(<first>)", async () => {
      const all = await repo.publishers.list({ isActive: true });
      if (all.length === 0) return { ok: true, detail: "no publishers (skipped)" };
      const found = await repo.publishers.getBySlug(all[0].slug);
      return { ok: found !== null, detail: `slug=${all[0].slug}` };
    }),
  );

  checks.push(
    await timed("tags.list()", async () => {
      const all = await repo.tags.list();
      return { ok: true, detail: `${all.length} tags` };
    }),
  );

  checks.push(
    await timed("posts.list({pageSize:5})", async () => {
      const page = await repo.posts.list({ pageSize: 5, page: 1 });
      return {
        ok: page.items.length <= 5,
        detail: `${page.items.length}/${page.total} (page 1 of ${Math.ceil(page.total / page.pageSize)})`,
      };
    }),
  );

  checks.push(
    await timed("posts.list (filter by publisher slug)", async () => {
      const pubs = await repo.publishers.list({ isActive: true });
      if (pubs.length === 0) return { ok: true, detail: "no publishers (skipped)" };
      const page = await repo.posts.list({ publisher: [pubs[0].slug], pageSize: 3 });
      return {
        ok: page.items.every((p) => p.publisher.slug === pubs[0].slug),
        detail: `${page.items.length} posts for ${pubs[0].slug}`,
      };
    }),
  );

  checks.push(
    await timed("posts.list (sort=trending)", async () => {
      const page = await repo.posts.list({ pageSize: 3, sort: "trending" });
      return { ok: true, detail: `${page.items.length}/${page.total}` };
    }),
  );

  checks.push(
    await timed("posts.trendingTop(5, 7)", async () => {
      const top = await repo.posts.trendingTop(5, 7);
      return { ok: top.length <= 5, detail: `${top.length} trending` };
    }),
  );

  checks.push(
    await timed("blogSources.listActive()", async () => {
      const sources = await repo.blogSources.listActive();
      return { ok: true, detail: `${sources.length} active sources` };
    }),
  );

  checks.push(
    await timed("audit.list(10)", async () => {
      const entries = await repo.audit.list(10);
      return { ok: entries.length <= 10, detail: `${entries.length} entries` };
    }),
  );

  checks.push(
    await timed("readEvents.countTotal()", async () => {
      const n = await repo.readEvents.countTotal();
      return { ok: typeof n === "number", detail: `${n} events` };
    }),
  );

  checks.push(
    await timed("readEvents.countByDay(7)", async () => {
      const buckets = await repo.readEvents.countByDay(7);
      return { ok: Array.isArray(buckets), detail: `${buckets.length} day buckets` };
    }),
  );

  return checks;
}

async function runWriteChecks(): Promise<CheckResult[]> {
  const repo = getRepository();
  const checks: CheckResult[] = [];
  const auditId = randomUUID();
  const targetId = randomUUID();

  checks.push(
    await timed("audit.insert (round-trip)", async () => {
      await repo.audit.insert({
        id: auditId,
        actorUserId: null,
        action: "smoke_test",
        targetType: "smoke",
        targetId,
        payload: { source: "smoke-supabase" },
        occurredAt: new Date().toISOString(),
      });
      const entries = await repo.audit.list(20);
      const found = entries.find((e) => e.id === auditId);
      return {
        ok: !!found && found.action === "smoke_test",
        detail: found ? "round-trip ok" : "row not found",
      };
    }),
  );

  return checks;
}

async function main(): Promise<void> {
  const env = getEnv();
  if (env.STORAGE_ADAPTER !== "supabase") {
    console.error(
      "STORAGE_ADAPTER must be 'supabase' (currently '" + env.STORAGE_ADAPTER + "').",
    );
    process.exit(2);
  }

  const includeWrites = process.argv.includes("--writes");
  console.log(
    `Smoke-testing Supabase adapter against ${env.NEXT_PUBLIC_SUPABASE_URL ?? "<unset>"} (writes=${includeWrites})\n`,
  );

  const checks = [...(await runReadChecks())];
  if (includeWrites) checks.push(...(await runWriteChecks()));

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;

  for (const c of checks) {
    const flag = c.ok ? "  PASS" : "  FAIL";
    console.log(`${flag} (${String(c.ms).padStart(5)}ms)  ${c.name}  -  ${c.detail}`);
  }
  console.log(`\n${passed}/${checks.length} passed, ${failed} failed.`);

  if (failed > 0) process.exit(1);
}

void main();
