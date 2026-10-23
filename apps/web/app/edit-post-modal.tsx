"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePostBody } from "@koino/core";
import type { PostWithAuthor } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./modal";

export function EditPostModal({ post, onClose }: { post: PostWithAuthor; onClose: () => void }) {
  const router = useRouter();
  const [body, setBody] = useState(post.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // Every other column is pinned by the posts UPDATE policy (see
      // 0044_edit_post_caption.sql) — this can only ever change the caption.
      await updatePostBody(createClient(), post.id, body);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Edit post</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="w-full rounded-xl border border-card-border bg-input px-4 py-3 text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={post.type === "text" ? "Share something encouraging…" : "Add a caption (optional)"}
          autoFocus
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}
