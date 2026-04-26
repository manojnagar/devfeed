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

import { resetMemoryStore } from "@/lib/data/memory/store";
import { __resetRepositoryCache, getRepository } from "@/lib/data";
import { __resetAuthCache } from "@/lib/auth";
import { __resetEmailCache } from "@/lib/email";

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
  togglePublisherActiveAction,
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
