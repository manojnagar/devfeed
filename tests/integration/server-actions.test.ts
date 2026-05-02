/**
 * @file Integration tests for the Server Actions themselves.
 *
 * Server Actions in Next.js 15 are plain async functions; the framework
 * provides a request scope via `next/headers` and `next/navigation`.
 * We mock those so we can call the real action functions directly
 * with a `FormData` object — same behavior the dev server triggers,
 * minus the wire encoding.
 *
 * Each block sets up a stub session cookie, calls the action,
 * and asserts the data layer transitioned correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const cookieStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = cookieStore.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(...args: unknown[]) {
      const [name, value] = args as [string, string];
      cookieStore.set(name, value);
    },
    delete(name: string) {
      cookieStore.delete(name);
    },
  }),
}));

class RedirectError extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}
class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}
const revalidateCalls: string[] = [];

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new NotFoundError();
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidateCalls.push(path);
  },
  revalidateTag: (tag: string) => {
    revalidateCalls.push(`tag:${tag}`);
  },
}));

vi.mock("@/lib/ingest/safe-fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ingest/safe-fetch")>(
    "@/lib/ingest/safe-fetch",
  );
  return {
    ...actual,
    safeFetch: vi.fn(),
  };
});

import { resetMemoryStore } from "@/lib/data/memory/store";
import { __resetRepositoryCache, getRepository } from "@/lib/data";
import { __resetAuthCache } from "@/lib/auth";
import { __resetEmailCache } from "@/lib/email";
import { __resetSlidingLimits } from "@/lib/rate-limit";
import { safeFetch, UnsafeUrlError } from "@/lib/ingest/safe-fetch";

const mockedSafeFetch = vi.mocked(safeFetch);

import {
  toggleBookmarkAction,
  togglePublisherFollowAction,
  toggleTagFollowAction,
  updateDigestPreferencesAction,
} from "@/app/(account)/me/actions";
import {
  signInAsDemoAdminAction,
  signInAsDemoUserAction,
  signInWithEmailAction,
  signOutAction,
} from "@/app/(public)/login/actions";
import { submitSuggestionAction } from "@/app/(public)/suggest/actions";
import {
  addSourceAction,
  decideSuggestionAction,
  deleteSourceAction,
  setSourceActiveAction,
  setUserBannedAction,
  setUserRoleAction,
  testFeedAction,
  togglePublisherActiveAction,
  updateSourceAction,
  upsertPublisherAction,
} from "@/app/(admin)/admin/actions";

const STUB_COOKIE = "df_stub_session";

function setSession(userId: string): void {
  cookieStore.set(
    STUB_COOKIE,
    JSON.stringify({ userId, expiresAt: new Date(Date.now() + 86_400_000).toISOString() }),
  );
}

function clearSession(): void {
  cookieStore.delete(STUB_COOKIE);
}

async function expectRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    throw new Error("expected a redirect");
  } catch (err) {
    if (err instanceof RedirectError) return err.url;
    throw err;
  }
}

beforeEach(() => {
  cookieStore.clear();
  revalidateCalls.length = 0;
  resetMemoryStore();
  __resetRepositoryCache();
  __resetAuthCache();
  __resetEmailCache();
  __resetSlidingLimits();
  mockedSafeFetch.mockReset();
});

describe("Server Action · login", () => {
  it("signInAsDemoUserAction sets the cookie + redirects to /me/digest", async () => {
    const url = await expectRedirect(() => signInAsDemoUserAction());
    expect(url).toBe("/me/digest");
    expect(cookieStore.has(STUB_COOKIE)).toBe(true);
  });

  it("signInAsDemoAdminAction redirects to /admin/overview", async () => {
    const url = await expectRedirect(() => signInAsDemoAdminAction());
    expect(url).toBe("/admin/overview");
  });

  it("signInWithEmailAction with a known seeded address signs in", async () => {
    const fd = new FormData();
    fd.set("email", "demo@devfeed.local");
    const url = await expectRedirect(() => signInWithEmailAction(fd));
    expect(url).toBe("/me/digest");
  });

  it("signInWithEmailAction with an unknown address surfaces an error", async () => {
    const fd = new FormData();
    fd.set("email", "stranger@example.com");
    const url = await expectRedirect(() => signInWithEmailAction(fd));
    expect(url).toMatch(/^\/login\?error=/);
  });

  it("signInWithEmailAction rejects invalid email", async () => {
    const fd = new FormData();
    fd.set("email", "not-an-email");
    const url = await expectRedirect(() => signInWithEmailAction(fd));
    expect(url).toBe("/login?error=invalid_email");
  });

  it("signOutAction clears the cookie", async () => {
    setSession("demo-user");
    const url = await expectRedirect(() => signOutAction());
    expect(url).toBe("/");
    expect(cookieStore.has(STUB_COOKIE)).toBe(false);
  });
});

describe("Server Action · /me/* mutations", () => {
  it("toggleBookmarkAction without a session redirects to /login", async () => {
    const fd = new FormData();
    fd.set("postId", "post-x");
    const url = await expectRedirect(() => toggleBookmarkAction(fd));
    expect(url).toMatch(/^\/login/);
  });

  it("toggleBookmarkAction adds + removes a bookmark + revalidates", async () => {
    setSession("demo-user");
    const repo = getRepository();
    const post = (await repo.posts.list({ pageSize: 1 })).items[0];

    const fd = new FormData();
    fd.set("postId", post.id);

    await toggleBookmarkAction(fd);
    expect(await repo.bookmarks.has("demo-user", post.id)).toBe(true);
    expect(revalidateCalls).toContain("/me/bookmarks");

    await toggleBookmarkAction(fd);
    expect(await repo.bookmarks.has("demo-user", post.id)).toBe(false);
  });

  it("togglePublisherFollowAction toggles state", async () => {
    setSession("demo-user");
    const repo = getRepository();
    const pub = (await repo.publishers.list({ isActive: true }))[0];
    const fd = new FormData();
    fd.set("publisherId", pub.id);

    await togglePublisherFollowAction(fd);
    let following = (await repo.follows.listFollowedPublishers("demo-user")).map((p) => p.id);
    expect(following).toContain(pub.id);

    await togglePublisherFollowAction(fd);
    following = (await repo.follows.listFollowedPublishers("demo-user")).map((p) => p.id);
    expect(following).not.toContain(pub.id);
  });

  it("toggleTagFollowAction toggles state", async () => {
    setSession("demo-user");
    const repo = getRepository();
    const tag = (await repo.tags.list())[0];
    const fd = new FormData();
    fd.set("tagId", tag.id);
    await toggleTagFollowAction(fd);
    expect((await repo.follows.listFollowedTags("demo-user")).map((t) => t.id)).toContain(tag.id);
  });

  it("updateDigestPreferencesAction persists the form values", async () => {
    setSession("demo-user");
    const repo = getRepository();

    const fd = new FormData();
    fd.set("frequency", "daily");
    fd.set("preferredHourUtc", "9");
    fd.set("includeFollowedPublishers", "on");
    fd.set("includeFollowedTags", "on");
    fd.append("includeAccessLabels", "free");
    fd.append("includeAccessLabels", "paid");
    fd.set("maxPostsPerEmail", "5");

    await updateDigestPreferencesAction(fd);

    const prefs = await repo.digest.getPreferences("demo-user");
    expect(prefs.frequency).toBe("daily");
    expect(prefs.preferredHourUtc).toBe(9);
    expect(prefs.includeFollowedPublishers).toBe(true);
    expect(prefs.includeAccessLabels).toEqual(expect.arrayContaining(["free", "paid"]));
    expect(prefs.maxPostsPerEmail).toBe(5);
    expect(revalidateCalls).toContain("/me/digest");
  });
});

describe("Server Action · /suggest", () => {
  it("rejects an unauthenticated submission", async () => {
    clearSession();
    const fd = new FormData();
    fd.set("type", "company");
    fd.set("name", "Example Engineering");
    fd.set("websiteUrl", "https://example-engineering.dev");
    fd.set("reason", "great writers");
    const url = await expectRedirect(() => submitSuggestionAction(null, fd));
    expect(url).toMatch(/^\/login/);
  });

  it("validates input, creates a pending suggestion, and redirects", async () => {
    setSession("demo-user");
    const repo = getRepository();

    const fd = new FormData();
    fd.set("type", "company");
    fd.set("name", "Example Engineering");
    fd.set("websiteUrl", "https://example-engineering.dev");
    fd.set("reason", "Great in-depth deep-dives.");

    const url = await expectRedirect(() => submitSuggestionAction(null, fd));
    expect(url).toMatch(/^\/me\/suggestions\?submitted=/);

    const userList = await repo.suggestions.listForUser("demo-user");
    expect(userList.length).toBe(1);
    expect(userList[0].name).toBe("Example Engineering");
    expect(userList[0].status).toBe("pending");
    expect(userList[0].submittedByUserId).toBe("demo-user");
  });

  it("returns field errors for bad input", async () => {
    setSession("demo-user");
    const fd = new FormData();
    fd.set("type", "company");
    fd.set("name", "X");
    fd.set("websiteUrl", "javascript:alert(1)");
    const result = await submitSuggestionAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.errors).toBeTruthy();
  });

  it("non-admin can't reach admin actions (404)", async () => {
    setSession("demo-user");
    const fd = new FormData();
    fd.set("type", "company");
    fd.set("name", "Hacked Inc");
    fd.set("websiteUrl", "https://hack.example");
    await expect(upsertPublisherAction(fd)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("blocks submissions over the per-user cap", async () => {
    setSession("demo-user");
    const repo = getRepository();
    for (let i = 0; i < 3; i++) {
      await repo.suggestions.insert({
        id: `seed-${i}`,
        submittedByUserId: "demo-user",
        type: "company",
        name: `Pending ${i}`,
        websiteUrl: `https://pending-${i}.dev`,
        feedUrl: null,
        feedKind: null,
        reason: null,
        autoValidation: null,
        status: "pending",
        reviewedByUserId: null,
        reviewerNotes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    const fd = new FormData();
    fd.set("type", "company");
    fd.set("name", "One More");
    fd.set("websiteUrl", "https://one-more.dev");
    const result = await submitSuggestionAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/3 pending/);
  });
});

describe("Server Action · /admin", () => {
  it("upsertPublisherAction creates a publisher + writes audit log", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();

    const fd = new FormData();
    fd.set("type", "company");
    fd.set("name", "New Brand Engineering");
    fd.set("websiteUrl", "https://new-brand.dev");
    fd.set("description", "Fresh blog");
    fd.set("defaultAccessLabel", "free");

    await upsertPublisherAction(fd);

    const list = await repo.publishers.list({ isActive: true });
    const created = list.find((p) => p.name === "New Brand Engineering");
    expect(created).toBeTruthy();
    expect(created?.slug).toBe("new-brand-engineering");

    const audit = await repo.audit.list(5);
    expect(audit[0].action).toBe("publisher.create");
    expect(revalidateCalls).toEqual(expect.arrayContaining(["/admin/publishers", "/publishers"]));
  });

  it("togglePublisherActiveAction deactivates a publisher", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];

    const fd = new FormData();
    fd.set("id", target.id);
    fd.set("active", "false");

    await togglePublisherActiveAction(fd);
    const stillActive = (await repo.publishers.list({ isActive: true })).map((p) => p.id);
    expect(stillActive).not.toContain(target.id);
    const audit = await repo.audit.list(5);
    expect(audit[0].action).toBe("publisher.deactivate");
  });

  it("addSourceAction attaches a feed source to a publisher", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    const before = await repo.blogSources.listByPublisher(target.id);

    const fd = new FormData();
    fd.set("publisherId", target.id);
    fd.set("feedUrl", "https://feeds.example.com/extra.xml");
    fd.set("kind", "rss");
    await addSourceAction(fd);

    const after = await repo.blogSources.listByPublisher(target.id);
    expect(after.length).toBe(before.length + 1);
    expect(after.some((s) => s.feedUrl === "https://feeds.example.com/extra.xml")).toBe(true);
  });

  it("updateSourceAction edits feed URL + kind and writes audit", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    const created = await repo.blogSources.upsert({
      id: "src-update-1",
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/before.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    });

    const fd = new FormData();
    fd.set("id", created.id);
    fd.set("publisherId", target.id);
    fd.set("feedUrl", "https://feeds.example.com/after.xml");
    fd.set("kind", "atom");
    const result = await updateSourceAction(null, fd);

    expect(result.ok).toBe(true);
    const after = await repo.blogSources.getById(created.id);
    expect(after?.feedUrl).toBe("https://feeds.example.com/after.xml");
    expect(after?.kind).toBe("atom");

    const audit = await repo.audit.list(5);
    expect(audit[0].action).toBe("source.update");
    expect(audit[0].targetId).toBe(created.id);
  });

  it("updateSourceAction rejects non-admin callers", async () => {
    setSession("demo-user");
    const fd = new FormData();
    fd.set("id", "src-anything");
    fd.set("publisherId", "pub-anything");
    fd.set("feedUrl", "https://feeds.example.com/x.xml");
    fd.set("kind", "rss");
    await expect(updateSourceAction(null, fd)).rejects.toThrow();
  });

  it("updateSourceAction returns a friendly error for invalid URL", async () => {
    setSession("demo-admin-user");
    const fd = new FormData();
    fd.set("id", "src-1");
    fd.set("publisherId", "pub-anything");
    fd.set("feedUrl", "not-a-url");
    fd.set("kind", "rss");
    const result = await updateSourceAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("updateSourceAction surfaces DUPLICATE_FEED_URL when (publisher, url) collides", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    await repo.blogSources.upsert({
      id: "src-dup-existing",
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/dup.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    });
    const editing = await repo.blogSources.upsert({
      id: "src-dup-editing",
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/other.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    });

    const fd = new FormData();
    fd.set("id", editing.id);
    fd.set("publisherId", target.id);
    fd.set("feedUrl", "https://feeds.example.com/dup.xml");
    fd.set("kind", "rss");
    const result = await updateSourceAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/already has this feed URL/i);
    // Original row stayed untouched.
    const stillExisting = await repo.blogSources.getById(editing.id);
    expect(stillExisting?.feedUrl).toBe("https://feeds.example.com/other.xml");
  });

  it("setSourceActiveAction toggles isActive and writes audit", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    const src = await repo.blogSources.upsert({
      id: "src-toggle-1",
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/toggle.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    });

    const hide = new FormData();
    hide.set("id", src.id);
    hide.set("isActive", "false");
    await setSourceActiveAction(hide);

    const hidden = await repo.blogSources.getById(src.id);
    expect(hidden?.isActive).toBe(false);
    const audit1 = await repo.audit.list(5);
    expect(audit1[0].action).toBe("source.deactivate");

    const show = new FormData();
    show.set("id", src.id);
    show.set("isActive", "true");
    await setSourceActiveAction(show);
    const reactivated = await repo.blogSources.getById(src.id);
    expect(reactivated?.isActive).toBe(true);
    const audit2 = await repo.audit.list(5);
    expect(audit2[0].action).toBe("source.activate");
  });

  it("deleteSourceAction requires the typed DELETE confirm token", async () => {
    setSession("demo-admin-user");
    const fd = new FormData();
    fd.set("id", "anything");
    fd.set("confirm", "delete"); // wrong case
    const result = await deleteSourceAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/type DELETE/i);
  });

  it("deleteSourceAction removes the source and cascades posts (in-memory mirrors prod cascade)", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    const src = await repo.blogSources.upsert({
      id: "src-delete-1",
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/gone.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    });
    await repo.posts.insertMany([
      {
        id: "post-cascade-1",
        publisherId: target.id,
        sourceId: src.id,
        title: "Cascading goodbye",
        summary: "this should disappear",
        url: "https://example.com/cascade-1",
        canonicalUrl: "https://example.com/cascade-1",
        authorName: null,
        publishedAt: new Date().toISOString(),
        readingTimeMin: 1,
        accessLabel: "free",
        paywallProvider: "unknown",
        thumbnailUrl: null,
        rawContentHash: "h-cascade-1",
        bodyHtml: null,
        bodySource: null,
        bodyExtractedAt: null,
        bodyFailedAt: null,
        bodyFailedReason: null,
        createdAt: new Date().toISOString(),
      },
    ]);

    const fd = new FormData();
    fd.set("id", src.id);
    fd.set("confirm", "DELETE");
    const result = await deleteSourceAction(null, fd);

    expect(result.ok).toBe(true);
    expect(await repo.blogSources.getById(src.id)).toBeNull();
    const remaining = await repo.posts.getByCanonicalUrl("https://example.com/cascade-1");
    expect(remaining).toBeNull();

    const audit = await repo.audit.list(5);
    expect(audit[0].action).toBe("source.delete");
    expect(audit[0].targetId).toBe(src.id);
  });

  it("deleteSourceAction rejects non-admin callers", async () => {
    setSession("demo-user");
    const fd = new FormData();
    fd.set("id", "src-x");
    fd.set("confirm", "DELETE");
    await expect(deleteSourceAction(null, fd)).rejects.toThrow();
  });

  it("testFeedAction returns sample items for a healthy URL and audits source.test", async () => {
    setSession("demo-admin-user");
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: `<?xml version="1.0"?><rss><channel><item><title>Hello</title><link>https://example.com/a</link><pubDate>Mon, 01 Apr 2025 00:00:00 GMT</pubDate></item></channel></rss>`,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      finalUrl: "https://example.com/feed.xml",
    });

    const fd = new FormData();
    fd.set("feedUrl", "https://example.com/feed.xml");
    const result = await testFeedAction(null, fd);

    expect(result.ok).toBe(true);
    expect(result.detail?.itemCount).toBe(1);
    expect(result.detail?.sampleItems[0].title).toBe("Hello");

    const repo = getRepository();
    const audit = await repo.audit.list(5);
    expect(audit[0].action).toBe("source.test");
    expect(audit[0].targetId).toBe("url:https://example.com/feed.xml");
  });

  it("testFeedAction resolves sourceId to the stored URL (admin can't smuggle a different URL)", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    const src = await repo.blogSources.upsert({
      id: "src-test-1",
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/known.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
    });
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: `<rss><channel><item><title>Stored</title><link>https://feeds.example.com/post</link></item></channel></rss>`,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      finalUrl: "https://feeds.example.com/known.xml",
    });

    const fd = new FormData();
    fd.set("sourceId", src.id);
    fd.set("feedUrl", "https://attacker.example/evil.xml"); // ignored
    const result = await testFeedAction(null, fd);

    expect(result.ok).toBe(true);
    expect(mockedSafeFetch).toHaveBeenCalledWith("https://feeds.example.com/known.xml");
    const audit = await repo.audit.list(5);
    expect(audit[0].action).toBe("source.test");
    expect(audit[0].targetId).toBe(src.id);
  });

  it("testFeedAction reports SSRF blocks without throwing", async () => {
    setSession("demo-admin-user");
    mockedSafeFetch.mockRejectedValueOnce(
      new UnsafeUrlError("Private host blocked: 127.0.0.1", "host"),
    );

    const fd = new FormData();
    fd.set("feedUrl", "http://127.0.0.1/feed");
    const result = await testFeedAction(null, fd);

    expect(result.ok).toBe(false);
    expect(result.detail?.error).toMatch(/SSRF/);
  });

  it("testFeedAction returns a friendly error for invalid input", async () => {
    setSession("demo-admin-user");
    const fd = new FormData();
    fd.set("feedUrl", "not-a-url");
    const result = await testFeedAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
    expect(mockedSafeFetch).not.toHaveBeenCalled();
  });

  it("testFeedAction rejects non-admin callers", async () => {
    setSession("demo-user");
    const fd = new FormData();
    fd.set("feedUrl", "https://example.com/feed.xml");
    await expect(testFeedAction(null, fd)).rejects.toThrow();
    expect(mockedSafeFetch).not.toHaveBeenCalled();
  });

  it("testFeedAction enforces the per-admin sliding rate limit", async () => {
    setSession("demo-admin-user");
    mockedSafeFetch.mockResolvedValue({
      status: 200,
      body: `<rss><channel><item><title>x</title><link>https://example.com/x</link></item></channel></rss>`,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      finalUrl: "https://example.com/feed.xml",
    });

    // Cap is 30/minute. Hit it.
    for (let i = 0; i < 30; i += 1) {
      const fd = new FormData();
      fd.set("feedUrl", "https://example.com/feed.xml");
      const r = await testFeedAction(null, fd);
      expect(r.ok).toBe(true);
    }

    const fd = new FormData();
    fd.set("feedUrl", "https://example.com/feed.xml");
    const blocked = await testFeedAction(null, fd);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/Too many tests/i);
  });

  it("decideSuggestionAction approve promotes the suggestion to a publisher", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const suggestion = await repo.suggestions.insert({
      id: "00000000-0000-4000-8000-000000000001",
      submittedByUserId: "demo-user",
      type: "company",
      name: "Promote Me",
      websiteUrl: "https://promote-me.dev",
      feedUrl: "https://promote-me.dev/feed",
      feedKind: "rss",
      reason: "great",
      autoValidation: { rssDetected: true, rssUrl: "https://promote-me.dev/feed", httpStatus: 200, inferredAccess: "free", notes: [] },
      status: "pending",
      reviewedByUserId: null,
      reviewerNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const fd = new FormData();
    fd.set("suggestionId", suggestion.id);
    fd.set("decision", "approve");
    fd.set("reviewerNotes", "Looks good");
    await decideSuggestionAction(fd);

    const decided = await repo.suggestions.getById(suggestion.id);
    expect(decided?.status).toBe("approved");

    const list = await repo.publishers.list({ isActive: true });
    const promoted = list.find((p) => p.name === "Promote Me");
    expect(promoted).toBeTruthy();

    const sources = await repo.blogSources.listByPublisher(promoted!.id);
    expect(sources.some((s) => s.feedUrl === "https://promote-me.dev/feed")).toBe(true);
  });

  it("decideSuggestionAction reject does NOT create a publisher", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const suggestion = await repo.suggestions.insert({
      id: "00000000-0000-4000-8000-000000000002",
      submittedByUserId: "demo-user",
      type: "company",
      name: "Reject Me",
      websiteUrl: "https://reject-me.dev",
      feedUrl: null,
      feedKind: null,
      reason: null,
      autoValidation: null,
      status: "pending",
      reviewedByUserId: null,
      reviewerNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const fd = new FormData();
    fd.set("suggestionId", suggestion.id);
    fd.set("decision", "reject");
    fd.set("reviewerNotes", "duplicate");
    await decideSuggestionAction(fd);

    const list = await repo.publishers.list({ isActive: true });
    expect(list.find((p) => p.name === "Reject Me")).toBeUndefined();
    const decided = await repo.suggestions.getById(suggestion.id);
    expect(decided?.status).toBe("rejected");
  });
});

describe("Server Action · /admin user role management", () => {
  /**
   * Seed an extra plain-user profile we can mutate without affecting the
   * built-in `demo-user` who is referenced by other tests.
   */
  async function seedExtraUser(
    overrides: Partial<{ role: "user" | "admin"; isBanned: boolean }> = {},
  ): Promise<string> {
    const repo = getRepository();
    const userId = `target-${Math.random().toString(36).slice(2, 8)}`;
    await repo.profiles.upsert({
      userId,
      email: `${userId}@devfeed.local`,
      displayName: "Target User",
      role: overrides.role ?? "user",
      isBanned: overrides.isBanned ?? false,
      createdAt: new Date().toISOString(),
    });
    return userId;
  }

  it("non-admin caller hits 404", async () => {
    setSession("demo-user");
    const fd = new FormData();
    fd.set("userId", "demo-admin-user");
    fd.set("role", "user");
    await expect(setUserRoleAction(null, fd)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("setUserRoleAction promotes a user → admin and writes audit", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const targetId = await seedExtraUser();

    const fd = new FormData();
    fd.set("userId", targetId);
    fd.set("role", "admin");

    const result = await setUserRoleAction(null, fd);
    expect(result.ok).toBe(true);

    const updated = await repo.profiles.getById(targetId);
    expect(updated?.role).toBe("admin");

    const audit = await repo.audit.list(5);
    const entry = audit.find((a) => a.action === "user.role.update" && a.targetId === targetId);
    expect(entry).toBeTruthy();
    expect(entry?.payload).toMatchObject({ from: "user", to: "admin" });
    expect(revalidateCalls).toContain("/admin/users");
  });

  it("setUserRoleAction demotes admin → user when another admin exists", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const otherAdminId = await seedExtraUser({ role: "admin" });

    const fd = new FormData();
    fd.set("userId", otherAdminId);
    fd.set("role", "user");

    const result = await setUserRoleAction(null, fd);
    expect(result.ok).toBe(true);

    const updated = await repo.profiles.getById(otherAdminId);
    expect(updated?.role).toBe("user");
  });

  it("setUserRoleAction blocks self-mutation", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();

    const fd = new FormData();
    fd.set("userId", "demo-admin-user");
    fd.set("role", "user");

    const result = await setUserRoleAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/your own role/i);

    const me = await repo.profiles.getById("demo-admin-user");
    expect(me?.role).toBe("admin");
  });

  /**
   * Note: the `LAST_ADMIN_GUARD` inside `setUserRoleAction` /
   * `setUserBannedAction` is defense-in-depth against a race condition
   * (caller demoted between `requireAdmin` and the guard query). It is
   * unreachable through normal serial flow because `requireAdmin`
   * always re-reads the caller's role from the DB at the start of the
   * action — so any caller that gets through is already an active
   * admin and counts toward `otherActiveAdmins`. We rely on code
   * review for that branch rather than racy timing in unit tests.
   */

  it("setUserRoleAction surfaces a friendly error on invalid role enum", async () => {
    setSession("demo-admin-user");
    const targetId = await seedExtraUser();

    const fd = new FormData();
    fd.set("userId", targetId);
    fd.set("role", "superuser");

    const result = await setUserRoleAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/invalid role/i);
  });

  it("setUserBannedAction bans a regular user and writes audit", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const targetId = await seedExtraUser();

    const fd = new FormData();
    fd.set("userId", targetId);
    fd.set("isBanned", "true");

    const result = await setUserBannedAction(null, fd);
    expect(result.ok).toBe(true);

    const updated = await repo.profiles.getById(targetId);
    expect(updated?.isBanned).toBe(true);

    const audit = await repo.audit.list(5);
    const entry = audit.find((a) => a.action === "user.ban.update" && a.targetId === targetId);
    expect(entry).toBeTruthy();
    expect(entry?.payload).toMatchObject({ from: false, to: true });
  });

  it("setUserBannedAction blocks self-ban", async () => {
    setSession("demo-admin-user");
    const fd = new FormData();
    fd.set("userId", "demo-admin-user");
    fd.set("isBanned", "true");

    const result = await setUserBannedAction(null, fd);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/your own role|ban status/i);
  });

  it("setUserBannedAction allows admin → ban another admin when other admins remain", async () => {
    setSession("demo-admin-user");
    const repo = getRepository();
    const otherAdminId = await seedExtraUser({ role: "admin" });

    const fd = new FormData();
    fd.set("userId", otherAdminId);
    fd.set("isBanned", "true");

    const result = await setUserBannedAction(null, fd);
    expect(result.ok).toBe(true);

    const updated = await repo.profiles.getById(otherAdminId);
    expect(updated?.isBanned).toBe(true);
  });

  it("setUserRoleAction is a no-op when target already has the requested role", async () => {
    setSession("demo-admin-user");
    const targetId = await seedExtraUser();

    const fd = new FormData();
    fd.set("userId", targetId);
    fd.set("role", "user");

    const result = await setUserRoleAction(null, fd);
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/already user/i);

    const audit = await getRepository().audit.list(5);
    expect(audit.find((a) => a.targetId === targetId && a.action === "user.role.update")).toBeUndefined();
  });
});
