"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost, createPostSchema, POST_BACKGROUNDS, type PostAudience, type PostBackground } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./modal";
import { BACKGROUND_STYLES } from "./post-backgrounds";

type PostType = "text" | "image" | "video";

const textareaClasses =
  "w-full rounded-xl border border-card-border bg-input px-4 py-3 text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50";

export function PostComposer({
  open,
  onClose,
  authorId,
  audience = "public",
}: {
  open: boolean;
  onClose: () => void;
  authorId: string;
  audience?: PostAudience;
}) {
  const router = useRouter();
  const [type, setType] = useState<PostType>("text");
  const [body, setBody] = useState("");
  const [background, setBackground] = useState<PostBackground | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setType("text");
    setBody("");
    setBackground(null);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function switchType(next: PostType) {
    setType(next);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let media_url: string | undefined;
    const client = createClient();

    if (type !== "text") {
      if (!file) {
        setError(type === "image" ? "Choose a photo to upload" : "Choose a video to upload");
        return;
      }
      setPending(true);
      const path = `${authorId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await client.storage.from("post-media").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setPending(false);
        return;
      }
      media_url = client.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    }

    const parsed = createPostSchema.safeParse({
      type,
      body: body || undefined,
      media_url,
      background: type === "text" ? background ?? undefined : undefined,
      audience,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid post");
      setPending(false);
      return;
    }

    setPending(true);
    try {
      // Every post publishes instantly now (see 0030_auto_approve_all_posts.sql) —
      // leaders/admins monitor recent posts afterward instead of pre-approving.
      await createPost(client, authorId, parsed.data);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">New post</h2>
      {done ? (
        <p className="text-sm text-muted">Posted! It&apos;s live in the feed now.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-4 text-sm">
            {(["text", "image", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchType(t)}
                className={type === t ? "font-semibold text-foreground underline underline-offset-4" : "text-muted"}
              >
                {t === "text" ? "Text" : t === "image" ? "Photo" : "Video"}
              </button>
            ))}
          </div>

          {type === "text" ? (
            <>
              <textarea
                className={
                  background
                    ? `w-full rounded-xl bg-gradient-to-br px-4 py-10 text-center text-lg font-medium text-white placeholder:text-white/70 outline-none ${BACKGROUND_STYLES[background].gradient}`
                    : textareaClasses
                }
                placeholder="Share something encouraging…"
                rows={background ? 5 : 4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBackground(null)}
                  aria-label="Plain background"
                  className={`h-7 w-7 rounded-full border-2 bg-input ${
                    background === null ? "border-olive-dark" : "border-card-border"
                  }`}
                />
                {POST_BACKGROUNDS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBackground(key)}
                    aria-label={`${key} background`}
                    className={`h-7 w-7 rounded-full bg-gradient-to-br ${BACKGROUND_STYLES[key].gradient} border-2 ${
                      background === key ? "border-olive-dark" : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <input
                type="file"
                accept={type === "image" ? "image/*" : "video/*"}
                onChange={handleFileChange}
                className="text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-input file:px-3 file:py-1.5 file:text-foreground"
              />
              {previewUrl &&
                (type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a stored asset
                  <img src={previewUrl} alt="Preview" className="max-h-64 w-full rounded-xl object-cover" />
                ) : (
                  <video src={previewUrl} controls className="max-h-64 w-full rounded-xl" />
                ))}
              <textarea
                className={textareaClasses}
                placeholder="Add a caption (optional)"
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {pending ? "Posting…" : "Post"}
          </button>
        </form>
      )}
    </Modal>
  );
}
