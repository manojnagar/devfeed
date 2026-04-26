/**
 * @file Cron endpoint that triggers a single ingest pass.
 *
 * Triggered by Vercel Cron on the schedule defined in `vercel.json`.
 * Authenticated via shared `CRON_SECRET` (Bearer header).
 */

import { NextResponse, type NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest/run";
import { log } from "@/lib/log";
import { isAuthorizedCron } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCron(req)) {
    log.warn("cron_unauthorized", { route: "ingest" });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runIngest();
  log.info("cron_ingest_complete", {
    processed: result.sourcesProcessed,
    failed: result.sourcesFailed,
    inserted: result.postsInserted,
  });
  return NextResponse.json(result);
}
