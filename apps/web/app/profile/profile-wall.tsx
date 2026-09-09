"use client";

import { useState } from "react";
import Link from "next/link";
import { addProfileComment, deleteProfileComment, profileCommentSchema } from "@koino/core";
import type { Profile, ProfileCommentWithAuthor } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";
import { ReportModal } from "../report-modal";

export function ProfileWall({
  profileId,
  isOwner,
  viewer,
  initialComments,
  textSize,
}: {
  profileId: string;
  isOwner: boolean;
  viewer: Profile | null;
  initialComments: ProfileCommentWithAuthor[];
  textSize?: number;
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ProfileCommentWithAuthor | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewer) return;
    setError(null);

    const parsed = profileCommentSchema.safeParse({ profile_id: profileId, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid comment");
      return;
    }

    setPending(true);
    try {
      const created = await addProfileComment(createClient(), viewer.id, parsed.data);
      setComments((prev) => [
        { ...created, author_username: viewer.username, author_avatar_url: viewer.avatar_url },
        ...prev,
      ]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try {
      await deleteProfileComment(createClient(), commentId);
    } catch {
      // best-effort; a reload will resync if this failed
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {viewer && viewer.status === "active" ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-card-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
            placeholder="Write something…"
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
      ) : viewer ? (
        <p className="text-sm text-muted">
          {viewer.status === "suspended"
            ? "Your account is suspended — you can't post right now."
            : "You'll be able to write here once you're part of the community."}
        </p>
      ) : (
        <p className="text-sm text-muted">Log in to write on this wall.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => {
            const canDelete = viewer && (isOwner || viewer.id === comment.author_id);
            const canReport = viewer && viewer.id !== comment.author_id;
            return (
              <li key={comment.id} className="flex items-start gap-3">
                <Avatar url={comment.author_avatar_url} username={comment.author_username} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/profile/${comment.author_username}`} className="text-sm font-medium text-foreground hover:underline">
                      @{comment.author_username}
                    </Link>
                    <div className="flex shrink-0 gap-2">
                      {canReport && (
                        <button
                          type="button"
                          onClick={() => setReportTarget(comment)}
                          className="text-xs text-muted hover:text-foreground"
                        >
                          Report
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-muted hover:text-foreground"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p
                    className={textSize ? "font-serif text-foreground" : "font-serif text-sm text-foreground"}
                    style={textSize ? { fontSize: textSize } : undefined}
                  >
                    {comment.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewer && reportTarget && (
        <ReportModal
          key={reportTarget.id}
          open
          onClose={() => setReportTarget(null)}
          reporterId={viewer.id}
          targetType="profile_comment"
          targetId={reportTarget.id}
        />
      )}
    </div>
  );
}
