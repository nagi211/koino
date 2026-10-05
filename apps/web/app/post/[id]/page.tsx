import { redirect } from "next/navigation";
import type { FriendshipStatus } from "@koino/core";
import {
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getPostsByIds,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { SinglePostView } from "./single-post-view";

export default async function SinglePostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comments?: string }>;
}) {
  const { id } = await params;
  const { comments } = await searchParams;
  const supabase = await createClient();
  const viewer = await getMyProfile(supabase);
  if (!viewer) redirect("/");

  // getPostsByIds is RLS-scoped like everywhere else — a post the viewer
  // isn't actually allowed to see (wrong audience, removed, etc.) just comes
  // back empty instead of leaking anything, and the view renders a plain
  // "not available" message for that case.
  const posts = await getPostsByIds(supabase, [id]);
  const post = posts[0] ?? null;
  const isSelf = post?.author_id === viewer.id;

  const [likedPostIds, savedPostIds, friendStatuses, unreadNotificationCount, unreadMessageCount] = await Promise.all([
    post ? getMyLikedPostIds(supabase, viewer.id, [post.id]).then((set) => Array.from(set)) : Promise.resolve([]),
    post ? getMySavedPostIds(supabase, viewer.id, [post.id]).then((set) => Array.from(set)) : Promise.resolve([]),
    post && !isSelf
      ? getMyFriendStatuses(supabase, viewer.id, [post.author_id])
      : Promise.resolve({} as Record<string, FriendshipStatus>),
    getUnreadNotificationCount(supabase, viewer.id),
    getUnreadMessageCount(supabase, viewer.id),
  ]);

  return (
    <SinglePostView
      profile={viewer}
      post={post}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatus={post ? friendStatuses[post.author_id] ?? "none" : "none"}
      unreadNotificationCount={unreadNotificationCount}
      unreadMessageCount={unreadMessageCount}
      openComments={comments === "1"}
    />
  );
}
