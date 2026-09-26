import { redirect } from "next/navigation";
import {
  getFriends,
  getFriendsFeed,
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getPendingFriendRequests,
  getUnreadNotificationCount,
} from "@koino/core";
import type { FriendshipStatus } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { FriendsFeed } from "./friends-feed";

export default async function FriendsPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  // The home feed already handles a signed-out visitor (public posts + a
  // sign-in entry point), so send them there instead of stranding them on a
  // dead-end "Sign in to..." message with no way to actually sign in.
  if (!profile) redirect("/");

  // getFriends/getPendingFriendRequests/getUnreadNotificationCount don't need
  // anything from the feed, so they're fired off immediately rather than
  // waiting on it — only the queries below that actually need
  // postIds/authorIds have to wait for getFriendsFeed to resolve first.
  const friendsPromise = getFriends(supabase, profile.id);
  const pendingRequestsPromise = getPendingFriendRequests(supabase, profile.id);
  const unreadNotificationCountPromise = getUnreadNotificationCount(supabase, profile.id);

  const posts = await getFriendsFeed(supabase);
  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id) => id !== profile.id)));

  const [likedPostIds, savedPostIds, friendStatuses, friends, pendingRequests, unreadNotificationCount] = await Promise.all([
    getMyLikedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
    getMySavedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
    getMyFriendStatuses(supabase, profile.id, authorIds),
    friendsPromise,
    pendingRequestsPromise,
    unreadNotificationCountPromise,
  ]);

  return (
    <FriendsFeed
      profile={profile}
      posts={posts}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatuses={friendStatuses as Record<string, FriendshipStatus>}
      initialFriends={friends}
      initialRequests={pendingRequests}
      unreadNotificationCount={unreadNotificationCount}
    />
  );
}
