/**
 * @file Cron endpoint that runs digest sends for the current UTC hour.
 */

import { NextResponse, type NextRequest } from "next/server";
import { runDigest } from "@/lib/digest/run";
import { log } from "@/lib/log";
import { isAuthorizedCron } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorizedCron(req)) {
    log.warn("cron_unauthorized", { route: "digest" });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDigest();
  log.info("cron_digest_complete", { ...result });
  return NextResponse.json(result);
}
