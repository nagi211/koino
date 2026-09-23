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
  const profilePromise = getMyProfile(supabase);
  const postsPromise = getApprovedFeed(supabase);
  const storiesPromise = getActiveStories(supabase);

  const profile = await profilePromise;

  // Only depend on profile.id, not on posts/stories — fired as soon as
  // profile resolves instead of waiting on the other two as well.
  const friendsPromise = profile ? getFriends(supabase, profile.id) : null;
  const pendingRequestsPromise = profile ? getPendingFriendRequests(supabase, profile.id) : null;
  const unreadCountPromise = profile ? getUnreadNotificationCount(supabase, profile.id) : null;

  const [posts, stories] = await Promise.all([postsPromise, storiesPromise]);

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
      friendsPromise!,
      pendingRequestsPromise!,
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
      friends={friends}
      pendingRequests={pendingRequests}
      stories={stories}
      unreadNotificationCount={unreadNotificationCount}
    />
  );
}
