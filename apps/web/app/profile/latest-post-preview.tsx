import Image from "next/image";
import type { PostWithAuthor } from "@koino/core";

/**
 * Just the content — no author row, no date, no card chrome (that's already on
 * the profile right above this). Media scales to fit the panel via
 * object-contain (shown at full size, shrunk only if it doesn't fit) instead of
 * cropping or scrolling; text wraps and clips instead of scrolling too.
 */
export function LatestPostPreview({ post }: { post: PostWithAuthor }) {
  const hasMedia = (post.type === "image" || post.type === "video") && post.media_url;

  if (hasMedia) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        {post.type === "image" ? (
          <Image src={post.media_url!} alt="" fill className="object-contain" />
        ) : (
          <video src={post.media_url!} controls className="h-full w-full object-contain" />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <p className="line-clamp-[12] w-full whitespace-pre-wrap break-words text-center text-lg text-foreground">{post.body}</p>
    </div>
  );
}
