import type { FriendshipStatus, FriendshipWithProfile } from "@koino/core";
import {
  getActiveStories,
  getApprovedFeed,
  getFriends,
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getPendingFriendRequests,
  getUnreadNotificationCount,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";

export default async function Home() {
  const supabase = await createClient();
  const [profile, posts, stories] = await Promise.all([
    getMyProfile(supabase),
    getApprovedFeed(supabase),
    getActiveStories(supabase),
  ]);

  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id) => id !== profile?.id)));

  let likedPostIds: string[] = [];
  let savedPostIds: string[] = [];
  let friendStatuses: Record<string, FriendshipStatus> = {};
  let friends: FriendshipWithProfile[] = [];
  let pendingRequests: FriendshipWithProfile[] = [];
  let unreadNotificationCount = 0;

  if (profile) {
    [likedPostIds, savedPostIds, friendStatuses, friends, pendingRequests, unreadNotificationCount] = await Promise.all([
      getMyLikedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
      getMySavedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
      getMyFriendStatuses(supabase, profile.id, authorIds),
      getFriends(supabase, profile.id),
      getPendingFriendRequests(supabase, profile.id),
      getUnreadNotificationCount(supabase, profile.id),
    ]);
  }

  return (
    <AppShell
      profile={profile}
      posts={posts}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatuses={friendStatuses}
      friends={friends}
      pendingRequests={pendingRequests}
      stories={stories}
      unreadNotificationCount={unreadNotificationCount}
    />
  );
}
