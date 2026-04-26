/**
 * @file Smoke test that bypasses login by injecting the stub session cookie.
 *
 * The stub adapter just stores `{userId, expiresAt}` JSON. We can craft
 * the cookie directly to verify protected pages render for the seeded
 * demo accounts without actually round-tripping through a Server Action.
 */

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

function cookieFor(userId) {
  const value = JSON.stringify({
    userId,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  return `df_stub_session=${encodeURIComponent(value)}`;
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : undefined,
    redirect: "manual",
  });
  return res.status;
}

const accountRoutes = ["/me/account", "/me/bookmarks", "/me/digest", "/me/followed-publishers", "/me/followed-tags", "/me/suggestions"];
const adminRoutes = ["/admin/overview", "/admin/publishers", "/admin/sources", "/admin/tags", "/admin/users", "/admin/moderation", "/admin/analytics", "/admin/audit"];

let failed = 0;
console.log("--- Anonymous (expect redirects + 404) ---");
for (const path of [...accountRoutes, ...adminRoutes]) {
  const code = await get(path);
  console.log(`${code}  ${path}`);
}

console.log("\n--- Demo user (expect 200 on /me/*, 404 on /admin/*) ---");
const userCookie = cookieFor("demo-user");
for (const path of [...accountRoutes, ...adminRoutes]) {
  const code = await get(path, userCookie);
  const ok = path.startsWith("/me/") ? code === 200 : code === 404;
  if (!ok) failed++;
  console.log(`${ok ? "OK " : "BAD"} ${code}  ${path}`);
}

console.log("\n--- Demo admin (expect 200 on /admin/* and /me/*) ---");
const adminCookie = cookieFor("demo-admin-user");
for (const path of [...accountRoutes, ...adminRoutes]) {
  const code = await get(path, adminCookie);
  const ok = code === 200;
  if (!ok) failed++;
  console.log(`${ok ? "OK " : "BAD"} ${code}  ${path}`);
}

console.log("");
console.log(failed ? `Auth smoke failed (${failed} mismatches)` : "Auth smoke passed");
process.exit(failed ? 1 : 0);
