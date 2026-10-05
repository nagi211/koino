import Image from "next/image";
import Link from "next/link";
import type { PostWithAuthor } from "@koino/core";
import { Avatar } from "./avatar";
import { PostDate } from "./post-date";
import { BACKGROUND_STYLES } from "./post-backgrounds";

export function PostCard({
  post,
  actions,
  menu,
}: {
  post: PostWithAuthor;
  actions?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const bg = post.type === "text" && post.background ? BACKGROUND_STYLES[post.background as keyof typeof BACKGROUND_STYLES] : null;
  const hasMedia = (post.type === "image" || post.type === "video") && post.media_url;

  return (
    <div
      className={
        bg
          ? `flex h-full w-full flex-col rounded-3xl bg-gradient-to-br p-6 shadow-lg sm:p-10 ${bg.gradient}`
          : "flex h-full w-full flex-col rounded-3xl border border-card-border bg-card p-6 shadow-lg sm:p-8"
      }
    >
      <div className="mb-4 flex shrink-0 items-start justify-between">
        <Link href={`/profile/${post.author_username}`} className="flex items-center gap-3">
          <Avatar url={post.author_avatar_url} username={post.author_username} size={36} />
          <div className={`flex flex-col text-sm ${bg ? "text-white/80" : "text-muted"}`}>
            <span className={`text-base font-semibold hover:underline ${bg ? "text-white" : "text-foreground"}`}>
              @{post.author_username}
            </span>
            <PostDate iso={post.created_at} />
          </div>
        </Link>
        {menu}
      </div>

      {hasMedia ? (
        <>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            {post.type === "image" ? (
              <Image src={post.media_url!} alt="" fill className="object-cover" />
            ) : (
              <video src={post.media_url!} controls className="h-full w-full object-cover" />
            )}
          </div>
          {post.body && <p className="mt-4 shrink-0 whitespace-pre-wrap font-serif text-lg text-foreground">{post.body}</p>}
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
