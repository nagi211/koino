"use client";

import { useState } from "react";
import { likePost, unlikePost } from "@koino/core";
import type { PostWithAuthor, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { CommentPanel } from "./comment-panel";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 20.5 C6 16 3 12.5 3 8.5 C3 5.7 5.2 4 7.5 4 C9.2 4 10.7 5 12 6.5 C13.3 5 14.8 4 16.5 4 C18.8 4 21 5.7 21 8.5 C21 12.5 18 16 12 20.5 Z" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16v11H8l-4 4V5z" strokeLinejoin="round" />
    </svg>
  );
}

export function PostActions({
  post,
  profile,
  initiallyLiked,
  requireAuth,
  requireEngagement,
  lightText,
}: {
  post: PostWithAuthor;
  profile: Profile | null;
  initiallyLiked: boolean;
  requireAuth: (action: () => void) => void;
  /** Gate for likes specifically — more permissive than requireAuth (open to any
   * non-suspended account, guests included) since a like is reversible and never
   * puts a guest's own text in front of anyone. Comments still go through
   * requireAuth/CommentPanel's own active-only check. */
  requireEngagement: (action: () => void) => void;
  lightText: boolean;
}) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [prevInitiallyLiked, setPrevInitiallyLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // initiallyLiked can change after mount (e.g. a guest signs in mid-session on a
  // feed that already contains a post they'd liked before) — resync when it does.
  if (initiallyLiked !== prevInitiallyLiked) {
    setPrevInitiallyLiked(initiallyLiked);
    setLiked(initiallyLiked);
  }

  async function toggleLike() {
    if (!profile) return;
    const client = createClient();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setLikeError(null);
    try {
      if (next) {
        await likePost(client, post.id, profile.id);
      } else {
        await unlikePost(client, post.id, profile.id);
      }
    } catch (err) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      setLikeError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const textClass = lightText ? "text-white/80 hover:text-white" : "text-muted hover:text-foreground";
  const likedClass = lightText ? "text-white" : "text-red-500";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-5 text-sm">
        <button
          type="button"
          onClick={() => requireEngagement(toggleLike)}
          className={`flex items-center gap-1.5 ${liked ? likedClass : textClass}`}
        >
          <HeartIcon filled={liked} />
          <span>{likeCount}</span>
        </button>
        <button type="button" onClick={() => setCommentsOpen(true)} className={`flex items-center gap-1.5 ${textClass}`}>
          <CommentIcon />
          <span>{commentCount}</span>
        </button>
      </div>
      {likeError && <p className="text-xs text-danger">{likeError}</p>}

      {commentsOpen && (
        <CommentPanel
          postId={post.id}
          profile={profile}
          requireAuth={requireAuth}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
        />
      )}
    </div>
  );
}
