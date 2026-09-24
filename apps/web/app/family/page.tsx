import { redirect } from "next/navigation";
import type { FriendshipStatus } from "@koino/core";
import {
  getFamily,
  getFamilyFeed,
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getPendingFamilyRequests,
  getUnreadNotificationCount,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { FamilyFeed } from "./family-feed";

export default async function FamilyPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  // The home feed already handles a signed-out visitor (public posts + a
  // sign-in entry point), so send them there instead of stranding them on a
  // dead-end "Sign in to..." message with no way to actually sign in.
  if (!profile) redirect("/");

  // getFamily/getPendingFamilyRequests/getUnreadNotificationCount don't need
  // anything from the feed, so they're fired off immediately rather than
  // waiting on it — only the three queries below that actually need
  // postIds/authorIds have to wait for getFamilyFeed to resolve first.
  const familyPromise = getFamily(supabase, profile.id);
  const pendingRequestsPromise = getPendingFamilyRequests(supabase, profile.id);
  const unreadNotificationCountPromise = getUnreadNotificationCount(supabase, profile.id);

  const posts = await getFamilyFeed(supabase);
  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id) => id !== profile.id)));

  const [likedPostIds, savedPostIds, friendStatuses, family, pendingRequests, unreadNotificationCount] = await Promise.all([
    getMyLikedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
    getMySavedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
    getMyFriendStatuses(supabase, profile.id, authorIds),
    familyPromise,
    pendingRequestsPromise,
    unreadNotificationCountPromise,
  ]);

  return (
    <FamilyFeed
      profile={profile}
      posts={posts}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatuses={friendStatuses as Record<string, FriendshipStatus>}
      initialFamily={family}
      initialRequests={pendingRequests}
      unreadNotificationCount={unreadNotificationCount}
    />
  );
}
