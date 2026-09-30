"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost, createPostSchema, POST_BACKGROUNDS, POST_TEXT_SIZE_RANGE, type PostAudience, type PostBackground } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./modal";
import { BACKGROUND_STYLES } from "./post-backgrounds";

type PostType = "text" | "image" | "video";

const textareaClasses =
  "w-full rounded-xl border border-card-border bg-input px-4 py-3 text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50";

const AUDIENCE_LABELS: Record<PostAudience, string> = {
  public: "Public",
  family: "Family",
  friends: "Friends",
};

// Splits the difference between the old fixed text-2xl/text-3xl (24-30px)
// a colored-background post always rendered at before this control existed.
const DEFAULT_POST_TEXT_SIZE = 28;

export function PostComposer({
  open,
  onClose,
  authorId,
  audience = "public",
  audienceOptions,
}: {
  open: boolean;
  onClose: () => void;
  authorId: string;
  /** Fixed audience for callers that already imply one by the page they're on
   * (e.g. /family, /friends) — ignored when audienceOptions is given. */
  audience?: PostAudience;
  /** Lets the poster pick, instead of a fixed audience — for a context like
   * the profile page where none is implied by the page itself. Only offer
   * values the caller has already confirmed this poster is actually allowed
   * to use (RLS still enforces it either way, but there's no reason to offer
   * a choice that's just going to fail). */
  audienceOptions?: PostAudience[];
}) {
  const router = useRouter();
  const [type, setType] = useState<PostType>("text");
  const [body, setBody] = useState("");
  const [background, setBackground] = useState<PostBackground | null>(null);
  const [textSize, setTextSize] = useState(DEFAULT_POST_TEXT_SIZE);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<PostAudience>(audienceOptions?.[0] ?? audience);
  const activeAudience = audienceOptions ? selectedAudience : audience;

  function reset() {
    setType("text");
    setBody("");
    setBackground(null);
    setTextSize(DEFAULT_POST_TEXT_SIZE);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setDone(false);
    setSelectedAudience(audienceOptions?.[0] ?? audience);
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
      text_size: type === "text" && background ? textSize : undefined,
      audience: activeAudience,
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

          {audienceOptions && audienceOptions.length > 1 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Who can see this</span>
              <div className="flex flex-wrap gap-2">
                {audienceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedAudience(option)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selectedAudience === option
                        ? "border-olive-dark bg-input text-foreground"
                        : "border-card-border text-muted hover:text-foreground"
                    }`}
                  >
                    {AUDIENCE_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === "text" ? (
            <>
              <textarea
                className={
                  background
                    ? `w-full rounded-xl bg-gradient-to-br px-4 py-10 text-center font-medium text-white placeholder:text-white/70 outline-none ${BACKGROUND_STYLES[background].gradient}`
                    : textareaClasses
                }
                style={background ? { fontSize: textSize } : undefined}
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
              {background && (
                <label className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-muted">Text size</span>
                  <input
                    type="range"
                    min={POST_TEXT_SIZE_RANGE.min}
                    max={POST_TEXT_SIZE_RANGE.max}
                    step={1}
                    value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    className="min-w-[100px] flex-1 accent-olive-dark"
                  />
                  <span className="w-10 shrink-0 text-right text-xs text-muted">{textSize}px</span>
                </label>
              )}
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
