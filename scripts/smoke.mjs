/**
 * @file Local smoke-test script.
 *
 * Hits the dev server on a fixed list of routes and prints the HTTP
 * status for each. Run with `node scripts/smoke.mjs`.
 */

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const routes = [
  ["GET", "/"],
  ["GET", "/about"],
  ["GET", "/publishers"],
  ["GET", "/publishers?type=person"],
  ["GET", "/tags"],
  ["GET", "/search?q=react"],
  ["GET", "/login"],
  ["GET", "/suggest"],
  ["GET", "/posts/post-does-not-exist-404"],
  ["GET", "/me/account"],
  ["GET", "/me/bookmarks"],
  ["GET", "/me/digest"],
  ["GET", "/admin/overview"],
  ["GET", "/admin/publishers"],
  ["GET", "/admin/moderation"],
  ["GET", "/admin/sources"],
  ["GET", "/admin/analytics"],
  ["GET", "/api/cron/ingest"],
  ["GET", "/api/cron/digest"],
  ["GET", "/api/digest/unsubscribe?token=bad"],
  ["GET", "/robots.txt"],
  ["GET", "/sitemap.xml"],
  ["GET", "/this-page-does-not-exist"],
];

let failed = 0;
for (const [method, path] of routes) {
  try {
    const res = await fetch(`${BASE}${path}`, { method, redirect: "manual" });
    const tag = res.status >= 200 && res.status < 400 ? "OK " : "BAD";
    if (res.status >= 500) failed++;
    console.log(`${tag} ${res.status} ${method} ${path}`);
  } catch (err) {
    failed++;
    console.log(`ERR  ---  ${method} ${path}  ${err?.message ?? err}`);
  }
}
console.log("");
console.log(failed ? `Smoke failed (${failed} 5xx/network)` : "Smoke passed");
process.exit(failed ? 1 : 0);
