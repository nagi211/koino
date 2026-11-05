import Link from "next/link";
import type { PostMedia, PostTagWithProfile, PostWithAuthor } from "@koino/core";
import { Avatar } from "./avatar";
import { PhotoCarousel } from "./photo-carousel";
import { PostCaption } from "./post-caption";
import { PostDate } from "./post-date";
import { BACKGROUND_STYLES } from "./post-backgrounds";

export function PostCard({
  post,
  media,
  tags,
  actions,
  menu,
}: {
  post: PostWithAuthor;
  /** Every photo on this post, in order — including the first/cover one that
   * also lives in post.media_url for backward compat. Omitted/empty on a
   * post with no post_media rows (video posts, or an image post created
   * before this existed) falls back to the single post.media_url. */
  media?: PostMedia[];
  /** Who the author tagged on this post — rendered as "— with @a, @b" under the
   * byline, Facebook-style. Omitted/empty means no tags to show. */
  tags?: PostTagWithProfile[];
  actions?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const bg = post.type === "text" && post.background ? BACKGROUND_STYLES[post.background as keyof typeof BACKGROUND_STYLES] : null;
  const photoUrls = media && media.length > 0 ? media.map((m) => m.media_url) : post.media_url ? [post.media_url] : [];
  const hasMedia = (post.type === "image" && photoUrls.length > 0) || (post.type === "video" && post.media_url);

  return (
    <div
      className={
        bg
          ? `flex h-full w-full flex-col overflow-y-auto rounded-3xl bg-gradient-to-br p-6 shadow-lg sm:p-10 ${bg.gradient}`
          : "flex h-full w-full flex-col overflow-y-auto rounded-3xl border border-card-border bg-card p-6 shadow-lg sm:p-8"
      }
    >
      <div className="mb-4 flex shrink-0 items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author_username}`}>
            <Avatar url={post.author_avatar_url} username={post.author_username} size={36} />
          </Link>
          <div className={`flex flex-col text-sm ${bg ? "text-white/80" : "text-muted"}`}>
            <span className={`text-base font-semibold ${bg ? "text-white" : "text-foreground"}`}>
              <Link href={`/profile/${post.author_username}`} className="hover:underline">
                @{post.author_username}
              </Link>
              {tags && tags.length > 0 && (
                <span className={`font-normal ${bg ? "text-white/80" : "text-muted"}`}>
                  {" "}
                  — with{" "}
                  {tags.map((tag, i) => (
                    <span key={tag.tag_id}>
                      {i > 0 && ", "}
                      <Link href={`/profile/${tag.profile.username}`} className="hover:underline">
                        @{tag.profile.username}
                      </Link>
                    </span>
                  ))}
                </span>
              )}
            </span>
            <PostDate iso={post.created_at} />
          </div>
        </div>
        {menu}
      </div>

      {hasMedia ? (
        <>
          {/* A fixed aspect ratio, not flex-1 — the photo/video must never
              shrink to make room for a long caption below it. */}
          <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-2xl">
            {post.type === "image" ? (
              <PhotoCarousel urls={photoUrls} />
            ) : (
              <video src={post.media_url!} controls className="h-full w-full object-cover" />
            )}
          </div>
          {post.body && <PostCaption text={post.body} light={false} />}
        </>
      ) : (
        post.body && (
          // min-w-0 matters here: a flex child defaults to min-width:auto, so
          // without it the paragraph's unwrapped content width can push past
          // the card's edge once the font gets large (see text_size control)
          // even though whitespace-pre-wrap/break-words would otherwise wrap it.
          <div className="flex min-h-0 min-w-0 flex-1 items-center">
            <p
              className={
                bg
                  ? `w-full whitespace-pre-wrap break-words text-center font-serif font-medium text-white ${post.text_size ? "" : "text-2xl sm:text-3xl"}`
                  : "w-full whitespace-pre-wrap break-words font-serif text-xl text-foreground"
              }
              style={bg && post.text_size ? { fontSize: post.text_size } : undefined}
            >
              {post.body}
            </p>
          </div>
        )
      )}

      {actions && <div className="mt-4 shrink-0">{actions}</div>}
    </div>
  );
}
