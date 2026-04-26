/**
 * @file Deep smoke test — exercises auth-gated routes and write paths.
 *
 * Hits the running dev server (default localhost:3000) for:
 *   - the cron endpoints with + without bearer auth
 *   - /out/[postId] read-tracking redirect
 *   - /api/digest/unsubscribe with both a valid + invalid token
 *   - the public + me/admin pages with appropriate stub session cookies
 *
 * Exits non-zero on any unexpected status so it's CI-friendly.
 *
 * Run: `npm run dev` in one terminal, then `node scripts/smoke-deep.mjs`
 */

import { createHmac } from "node:crypto";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "dev-only-cron-secret-do-not-use-in-prod";
const UNSUB_SECRET =
  process.env.UNSUBSCRIBE_SECRET ?? "dev-only-unsubscribe-secret-do-not-use-in-prod";

let failed = 0;

function logOk(tag, ...rest) {
  console.log(`OK    ${tag}`, ...rest);
}
function logFail(tag, ...rest) {
  failed += 1;
  console.log(`FAIL  ${tag}`, ...rest);
}

async function expect(label, fn, predicate) {
  try {
    const value = await fn();
    if (predicate(value)) {
      logOk(label, "→", typeof value === "object" ? "(see details below)" : value);
    } else {
      logFail(label, "got", value);
    }
  } catch (err) {
    logFail(label, "error:", err?.message ?? err);
  }
}

function stubSessionCookie(userId) {
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
  const value = JSON.stringify({ userId, expiresAt });
  return `df_stub_session=${encodeURIComponent(value)}`;
}

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createUnsubscribeToken(userId) {
  const sig = createHmac("sha256", UNSUB_SECRET).update(userId).digest();
  return `${userId}.${base64url(sig)}`;
}

console.log(`# devfeed deep smoke against ${BASE}`);
console.log("");

console.log("## cron · auth");
await expect("cron/ingest without auth → 401", async () => {
  const res = await fetch(`${BASE}/api/cron/ingest`);
  return res.status;
}, (s) => s === 401);

await expect("cron/digest without auth → 401", async () => {
  const res = await fetch(`${BASE}/api/cron/digest`);
  return res.status;
}, (s) => s === 401);

await expect("cron/ingest wrong bearer → 401", async () => {
  const res = await fetch(`${BASE}/api/cron/ingest`, {
    headers: { authorization: "Bearer wrong" },
  });
  return res.status;
}, (s) => s === 401);

await expect("cron/ingest with bearer → 200 + sourcesProcessed", async () => {
  const res = await fetch(`${BASE}/api/cron/ingest`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => null);
  console.log("       body:", body);
  return res.status === 200 && body && typeof body.sourcesProcessed === "number";
}, (ok) => ok === true);

await expect("cron/digest with bearer → 200 + sent/skipped", async () => {
  const res = await fetch(`${BASE}/api/cron/digest`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => null);
  console.log("       body:", body);
  return res.status === 200 && body && typeof body.sent === "number";
}, (ok) => ok === true);

console.log("");
console.log("## /out redirect");
let postId = null;
await expect("home page contains /out/<postId> link", async () => {
  const html = await fetch(`${BASE}/`).then((r) => r.text());
  const m = html.match(/\/out\/([a-zA-Z0-9_-]+)/);
  postId = m?.[1] ?? null;
  return postId;
}, (id) => typeof id === "string" && id.length > 0);

if (postId) {
  await expect(`/out/${postId} → 307/308 redirect to publisher URL`, async () => {
    const res = await fetch(`${BASE}/out/${postId}`, { redirect: "manual" });
    const loc = res.headers.get("location");
    console.log("       location:", loc);
    return { status: res.status, hasLocation: !!loc };
  }, (v) => (v.status === 307 || v.status === 308 || v.status === 302) && v.hasLocation);
} else {
  logFail("skipped /out test — could not find a post id");
}

console.log("");
console.log("## /api/digest/unsubscribe");
await expect("unsubscribe with bad token → 400", async () => {
  const res = await fetch(`${BASE}/api/digest/unsubscribe?token=garbage`);
  return res.status;
}, (s) => s === 400);

await expect("unsubscribe missing token → 400", async () => {
  const res = await fetch(`${BASE}/api/digest/unsubscribe`);
  return res.status;
}, (s) => s === 400);

await expect("unsubscribe with valid token → 200 HTML", async () => {
  const token = createUnsubscribeToken("demo-user");
  const res = await fetch(
    `${BASE}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`,
  );
  const text = await res.text();
  return { status: res.status, mentionsUnsubscribed: /unsubscribe/i.test(text) };
}, (v) => v.status === 200 && v.mentionsUnsubscribed);

console.log("");
console.log("## auth gating");
await expect("/me/account anonymous → 307 redirect to /login", async () => {
  const res = await fetch(`${BASE}/me/account`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  return { status: res.status, loc };
}, (v) => (v.status === 307 || v.status === 302) && /\/login/.test(v.loc));

await expect("/me/account with user cookie → 200", async () => {
  const res = await fetch(`${BASE}/me/account`, {
    headers: { cookie: stubSessionCookie("demo-user") },
  });
  return res.status;
}, (s) => s === 200);

await expect("/admin/overview anonymous → 404 (intentional, hides admin)", async () => {
  const res = await fetch(`${BASE}/admin/overview`);
  return res.status;
}, (s) => s === 404);

await expect("/admin/overview as user → 404 (still hidden)", async () => {
  const res = await fetch(`${BASE}/admin/overview`, {
    headers: { cookie: stubSessionCookie("demo-user") },
  });
  return res.status;
}, (s) => s === 404);

await expect("/admin/overview as admin → 200", async () => {
  const res = await fetch(`${BASE}/admin/overview`, {
    headers: { cookie: stubSessionCookie("demo-admin-user") },
  });
  return res.status;
}, (s) => s === 200);

console.log("");
console.log("## SEO");
await expect("/robots.txt returns disallow rules", async () => {
  const res = await fetch(`${BASE}/robots.txt`);
  const text = await res.text();
  return { status: res.status, hasDisallow: /Disallow:/i.test(text) };
}, (v) => v.status === 200 && v.hasDisallow);

await expect("/sitemap.xml is well-formed", async () => {
  const res = await fetch(`${BASE}/sitemap.xml`);
  const text = await res.text();
  return { status: res.status, isXml: /^<\?xml/.test(text), hasUrls: /<url>/.test(text) };
}, (v) => v.status === 200 && v.isXml && v.hasUrls);

console.log("");
if (failed === 0) {
  console.log(`✓ deep smoke passed`);
  process.exit(0);
}
console.log(`✗ deep smoke failed: ${failed} check(s)`);
process.exit(1);
