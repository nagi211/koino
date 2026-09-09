"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPostStatus } from "@koino/core";
import type { PostWithAuthor } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "../post-card";

/** Posts publish instantly now — this is a monitoring feed, not an approval queue. */
export function RecentPosts({ posts }: { posts: PostWithAuthor[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hide(post: PostWithAuthor) {
    if (!window.confirm(`Hide @${post.author_username}'s post? It will no longer be visible to anyone but them.`)) return;
    setError(null);
    setPendingId(post.id);
    try {
      await setPostStatus(createClient(), post.id, "hidden");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (posts.length === 0) {
    return <p className="text-muted">No recent posts in your group.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="flex flex-col gap-4">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard
              post={post}
              actions={
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => hide(post)}
                  className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                >
                  Hide post
                </button>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
