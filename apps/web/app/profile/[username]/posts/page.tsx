import { notFound, redirect } from "next/navigation";
import type { FriendshipStatus } from "@koino/core";
import {
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getPostTagsForPosts,
  getProfileByUsername,
  getUnreadMessageCount,
  getUnreadNotificationCount,
  getVisiblePostsByAuthor,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { ProfilePostsFeed } from "./profile-posts-feed";

export default async function ProfilePostsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const [viewer, target] = await Promise.all([getMyProfile(supabase), getProfileByUsername(supabase, username)]);
  if (!target) notFound();
  if (!viewer) redirect("/");

  const isSelf = viewer.id === target.id;

  const posts = await getVisiblePostsByAuthor(supabase, target.id);
  const postIds = posts.map((post) => post.id);

  const [likedPostIds, savedPostIds, friendStatuses, tags, unreadNotificationCount, unreadMessageCount] = await Promise.all([
    getMyLikedPostIds(supabase, viewer.id, postIds).then((set) => Array.from(set)),
    getMySavedPostIds(supabase, viewer.id, postIds).then((set) => Array.from(set)),
    !isSelf ? getMyFriendStatuses(supabase, viewer.id, [target.id]) : Promise.resolve({} as Record<string, FriendshipStatus>),
    getPostTagsForPosts(supabase, postIds),
    getUnreadNotificationCount(supabase, viewer.id),
    getUnreadMessageCount(supabase, viewer.id),
  ]);

  return (
    <ProfilePostsFeed
      profile={viewer}
      target={target}
      posts={posts}
      tags={tags}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatus={friendStatuses[target.id] ?? "none"}
      unreadNotificationCount={unreadNotificationCount}
      unreadMessageCount={unreadMessageCount}
    />
  );
}
