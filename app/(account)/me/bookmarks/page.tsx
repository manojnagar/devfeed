/**
 * @file Bookmarks page — articles the user saved for later.
 */

import { Bookmark } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { PostCard } from "@/components/post/post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { toggleBookmarkAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const session = await requireUser();
  const bookmarks = await getRepository().bookmarks.listForUser(session.user.userId);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <p className="text-sm text-[rgb(var(--color-fg-muted))]">
          {bookmarks.length} saved {bookmarks.length === 1 ? "post" : "posts"}
        </p>
      </header>
      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={28} />}
          title="No bookmarks yet"
          description="Tap the bookmark icon on any post to save it here."
        />
      ) : (
        <ul className="space-y-3">
          {bookmarks.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                isBookmarked
                bookmarkAction={
                  <form action={toggleBookmarkAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button
                      type="submit"
                      className="text-[rgb(var(--color-accent))] hover:opacity-80 text-xs"
                      aria-label="Remove bookmark"
                    >
                      Remove
                    </button>
                  </form>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
