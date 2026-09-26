import type { FriendshipStatus } from "@koino/core";
import {
  getActiveStories,
  getApprovedFeed,
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getUnreadNotificationCount,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";

export default async function Home() {
  const supabase = await createClient();
  const profilePromise = getMyProfile(supabase);
  const postsPromise = getApprovedFeed(supabase);
  const storiesPromise = getActiveStories(supabase);

  const profile = await profilePromise;

  // Only depend on profile.id, not on posts/stories — fired as soon as
  // profile resolves instead of waiting on the other two as well.
  const unreadCountPromise = profile ? getUnreadNotificationCount(supabase, profile.id) : null;

  const [posts, stories] = await Promise.all([postsPromise, storiesPromise]);

  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id) => id !== profile?.id)));

  let likedPostIds: string[] = [];
  let savedPostIds: string[] = [];
  let friendStatuses: Record<string, FriendshipStatus> = {};
  let unreadNotificationCount = 0;

  if (profile) {
    [likedPostIds, savedPostIds, friendStatuses, unreadNotificationCount] = await Promise.all([
      getMyLikedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
      getMySavedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
      getMyFriendStatuses(supabase, profile.id, authorIds),
      unreadCountPromise!,
    ]);
  }

  return (
    <AppShell
      profile={profile}
      posts={posts}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatuses={friendStatuses}
      stories={stories}
      unreadNotificationCount={unreadNotificationCount}
    />
  );
}
