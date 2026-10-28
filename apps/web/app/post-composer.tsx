"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPost,
  createPostSchema,
  getFamily,
  getFriends,
  tagProfilesOnPost,
  POST_BACKGROUNDS,
  POST_TEXT_SIZE_RANGE,
  type PostAudience,
  type PostBackground,
  type Profile,
} from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";
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

// A draft only ever holds what's actually safe/possible to persist to
// localStorage — a File object can't be serialized, so a photo/video draft
// keeps its caption and type but drops the file itself; the composer just
// asks the poster to re-attach it when they come back.
type PostDraft = {
  type: PostType;
  body: string;
  background: PostBackground | null;
  textSize: number;
  audience: PostAudience;
};

function draftKey(authorId: string) {
  return `koino:post-draft:${authorId}`;
}

function loadDraft(authorId: string): PostDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(authorId));
    return raw ? (JSON.parse(raw) as PostDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(authorId: string, draft: PostDraft) {
  try {
    window.localStorage.setItem(draftKey(authorId), JSON.stringify(draft));
  } catch {
    // best-effort — a draft failing to save (e.g. storage disabled/full)
    // shouldn't block the close the poster actually asked for
  }
}

function clearDraft(authorId: string) {
  try {
    window.localStorage.removeItem(draftKey(authorId));
  } catch {
    // best-effort, see saveDraft
  }
}

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
  const [restoredDraft, setRestoredDraft] = useState(false);
  // Shown in place of the form when closing would otherwise silently drop
  // unposted content — lets the poster pick save-as-draft vs. discard
  // instead of just losing it.
  const [confirmingClose, setConfirmingClose] = useState(false);
  // Who can be tagged — the poster's own confirmed friends + family, merged
  // and deduped (family counts as an automatic friend everywhere else in the
  // app — see 0038/0039 — so the pick list follows the same rule). Fetched
  // lazily on open rather than threaded down as a prop, since PostComposer
  // is mounted from four different page trees and none of them currently
  // pass both lists all the way down.
  const [tagCandidates, setTagCandidates] = useState<Profile[] | null>(null);
  const [taggedIds, setTaggedIds] = useState<Set<string>>(new Set());
  const [tagQuery, setTagQuery] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);

  // Picks up any draft left from a previous visit each time the composer
  // opens — a fixed audience/page context overrides whatever audience the
  // draft was saved under, so a draft never ends up pointed somewhere this
  // instance of the composer can't actually offer. Adjusted during render
  // (React's documented pattern for deriving state from a prop transition)
  // rather than in an effect, since the composer stays mounted across
  // opens/closes instead of remounting — an effect keyed on `open` would
  // still fire exactly once per open either way, just a render later.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const draft = loadDraft(authorId);
      if (draft) {
        setType(draft.type);
        setBody(draft.body);
        setBackground(draft.background);
        setTextSize(draft.textSize);
        if (audienceOptions) {
          setSelectedAudience(audienceOptions.includes(draft.audience) ? draft.audience : audienceOptions[0]);
        }
        setRestoredDraft(true);
      }
      if (tagCandidates === null) {
        const client = createClient();
        Promise.all([getFriends(client, authorId), getFamily(client, authorId)]).then(([friends, family]) => {
          const people: Profile[] = [];
          const seenIds = new Set<string>();
          for (const friend of friends) {
            if (seenIds.has(friend.profile.id)) continue;
            seenIds.add(friend.profile.id);
            people.push(friend.profile);
          }
          for (const member of family) {
            if (seenIds.has(member.profile.id)) continue;
            seenIds.add(member.profile.id);
            people.push(member.profile);
          }
          setTagCandidates(people);
        });
      }
    }
  }

  function isFormEmpty() {
    return !body.trim() && !file && !background;
  }

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
    setRestoredDraft(false);
    setConfirmingClose(false);
    setTaggedIds(new Set());
    setTagQuery("");
    setShowTagPicker(false);
  }

  // Gates every close attempt (✕ button and backdrop click both route
  // through this, via Modal's confirmClose) — returning false keeps the
  // modal open and shows the draft/discard prompt in place of the form
  // instead of letting the close through.
  function guardClose(): boolean {
    if (done || isFormEmpty()) return true;
    setConfirmingClose(true);
    return false;
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSaveDraft() {
    saveDraft(authorId, { type, body, background, textSize, audience: activeAudience });
    reset();
    onClose();
  }

  function handleDiscardDraft() {
    clearDraft(authorId);
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
      const newPost = await createPost(client, authorId, parsed.data);
      if (taggedIds.size > 0) {
        await tagProfilesOnPost(client, newPost.id, Array.from(taggedIds));
      }
      clearDraft(authorId);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} confirmClose={guardClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">New post</h2>
      {done ? (
        <p className="text-sm text-muted">Posted! It&apos;s live in the feed now.</p>
      ) : confirmingClose ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            This post hasn&rsquo;t been shared yet. Save it as a draft to finish later, or discard it?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="flex-1 rounded-xl border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 rounded-xl bg-olive-dark px-4 py-2 text-sm font-medium text-white hover:brightness-105"
            >
              Save as draft
            </button>
          </div>
          <button type="button" onClick={() => setConfirmingClose(false)} className="text-sm text-muted hover:text-foreground">
            Keep editing
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {restoredDraft && (
            <p className="text-xs text-muted">
              Continuing a draft from earlier.{" "}
              <button
                type="button"
                onClick={() => {
                  clearDraft(authorId);
                  reset();
                }}
                className="underline hover:text-foreground"
              >
                Start fresh
              </button>
            </p>
          )}

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

          {audienceOptions && audienceOptions.length > 1 ? (
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
          ) : (
            // No picker to show — either the page itself implies a single
            // audience (e.g. /family, /friends: no audienceOptions at all),
            // or audienceOptions narrowed to exactly one choice (a guest on
            // the profile page only has Family available). Either way, say
            // so plainly instead of leaving where this is headed unstated.
            <p className="text-xs text-muted">
              Posting to <span className="font-medium text-foreground">{AUDIENCE_LABELS[activeAudience]}</span>.
            </p>
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
              {restoredDraft && !file && (
                <p className="text-xs text-muted">This draft had a {type} attached — re-select it to finish posting.</p>
              )}
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

          {tagCandidates && tagCandidates.length > 0 && (
            <div className="flex flex-col gap-2">
              {taggedIds.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tagCandidates
                    .filter((person) => taggedIds.has(person.id))
                    .map((person) => {
                      const name = person.display_name ?? person.username;
                      return (
                        <span
                          key={person.id}
                          className="flex items-center gap-1 rounded-full border border-card-border bg-input px-2 py-1 text-xs text-foreground"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() =>
                              setTaggedIds((prev) => {
                                const next = new Set(prev);
                                next.delete(person.id);
                                return next;
                              })
                            }
                            aria-label={`Remove tag: ${name}`}
                            className="text-muted hover:text-foreground"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowTagPicker((v) => !v)}
                className="self-start text-xs text-olive-dark hover:underline"
              >
                {showTagPicker ? "Done tagging" : taggedIds.size > 0 ? "Edit tags" : "Tag people"}
              </button>
              {showTagPicker && (
                <div className="flex flex-col gap-2 rounded-xl border border-card-border p-3">
                  <input
                    type="text"
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    placeholder="Search friends and family…"
                    className="w-full rounded-lg border border-card-border bg-input px-3 py-1.5 text-sm text-foreground placeholder:text-muted outline-none"
                  />
                  <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
                    {tagCandidates
                      .filter((person) => (person.display_name ?? person.username).toLowerCase().includes(tagQuery.toLowerCase()))
                      .map((person) => {
                        const name = person.display_name ?? person.username;
                        const isTagged = taggedIds.has(person.id);
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() =>
                              setTaggedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(person.id)) next.delete(person.id);
                                else next.add(person.id);
                                return next;
                              })
                            }
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                              isTagged ? "bg-input text-foreground" : "text-muted hover:text-foreground"
                            }`}
                          >
                            <Avatar url={person.avatar_url} username={name} size={24} />
                            {name}
                            {isTagged && <span className="ml-auto text-xs text-olive-dark">Tagged</span>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
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
