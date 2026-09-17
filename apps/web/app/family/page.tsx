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

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Sign in to see your family circle.</p>
      </main>
    );
  }

  const posts = await getFamilyFeed(supabase);
  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id) => id !== profile.id)));

  const [likedPostIds, savedPostIds, friendStatuses, family, pendingRequests, unreadNotificationCount] = await Promise.all([
    getMyLikedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
    getMySavedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
    getMyFriendStatuses(supabase, profile.id, authorIds),
    getFamily(supabase, profile.id),
    getPendingFamilyRequests(supabase, profile.id),
    getUnreadNotificationCount(supabase, profile.id),
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
