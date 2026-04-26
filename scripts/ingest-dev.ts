/**
 * @file Local-only ingest runner.
 *
 * Calls `runIngest()` once and prints a summary. The same code path is
 * triggered from `/api/cron/ingest` in production. Useful when you want
 * to refresh the in-memory feed without keeping the dev server up.
 */

import { runIngest } from "../lib/ingest/run";

async function main(): Promise<void> {
  console.log("Running ingest pass...");
  const result = await runIngest();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
