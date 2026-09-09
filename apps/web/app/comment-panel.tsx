"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addComment, commentSchema, getComments } from "@koino/core";
import type { PostCommentWithAuthor, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";

export function CommentPanel({
  postId,
  profile,
  requireAuth,
  onClose,
  onCommentAdded,
}: {
  postId: string;
  profile: Profile | null;
  requireAuth: (action: () => void) => void;
  onClose: () => void;
  onCommentAdded: () => void;
}) {
  const [comments, setComments] = useState<PostCommentWithAuthor[] | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getComments(createClient(), postId).then((data) => {
      if (!cancelled) setComments(data);
    });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    const parsed = commentSchema.safeParse({ post_id: postId, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid comment");
      return;
    }

    setPending(true);
    try {
      const created = await addComment(createClient(), profile.id, parsed.data);
      setComments((prev) => [
        ...(prev ?? []),
        { ...created, author_username: profile.username, author_avatar_url: profile.avatar_url },
      ]);
      setBody("");
      onCommentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-t-3xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-card-border" />
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Comments</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {comments === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted">No comments yet — be the first.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start gap-2 text-sm">
                  <Avatar url={comment.author_avatar_url} username={comment.author_username} size={24} />
                  <p>
                    <Link href={`/profile/${comment.author_username}`} className="font-medium text-foreground hover:underline">
                      @{comment.author_username}
                    </Link>{" "}
                    <span className="text-foreground">{comment.body}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="mt-2 shrink-0 text-sm text-danger">{error}</p>}

        <div className="mt-3 shrink-0 border-t border-card-border pt-3">
          {profile && profile.status === "active" ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-card-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
                placeholder="Add a comment…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-olive-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Post
              </button>
            </form>
          ) : profile ? (
            <button
              type="button"
              onClick={() => requireAuth(() => {})}
              className="w-full rounded-xl border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              {profile.status === "suspended" ? "Your account is suspended" : "You'll be able to comment once you're part of the community"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => requireAuth(() => {})}
              className="w-full rounded-xl border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Log in to comment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
