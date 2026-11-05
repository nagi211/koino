import type { FamilyConnectionWithProfile, FriendshipStatus, FriendshipWithProfile, PostMedia, PostTagWithProfile } from "@koino/core";
import {
  getApprovedFeed,
  getFamily,
  getFriends,
  getMyFriendStatuses,
  getMyLikedPostIds,
  getMyProfile,
  getMySavedPostIds,
  getPostMediaForPosts,
  getPostTagsForPosts,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";

export default async function Home() {
  const supabase = await createClient();
  const profilePromise = getMyProfile(supabase);
  const postsPromise = getApprovedFeed(supabase);

  const profile = await profilePromise;

  // Only depend on profile.id, not on posts — fired as soon as profile
  // resolves instead of waiting on posts as well.
  const unreadCountPromise = profile ? getUnreadNotificationCount(supabase, profile.id) : null;
  const unreadMessageCountPromise = profile ? getUnreadMessageCount(supabase, profile.id) : null;
  const friendsPromise = profile ? getFriends(supabase, profile.id) : null;
  const familyPromise = profile ? getFamily(supabase, profile.id) : null;

  const posts = await postsPromise;

  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id).filter((id) => id !== profile?.id)));

  // Tags and media are visible to anyone who can see the post itself
  // (0047_post_tags.sql, 0049_post_media.sql) — not gated behind `profile`,
  // same as posts/stories above.
  const [tags, media]: [Record<string, PostTagWithProfile[]>, Record<string, PostMedia[]>] = await Promise.all([
    getPostTagsForPosts(supabase, postIds),
    getPostMediaForPosts(supabase, postIds),
  ]);

  let likedPostIds: string[] = [];
  let savedPostIds: string[] = [];
  let friendStatuses: Record<string, FriendshipStatus> = {};
  let friends: FriendshipWithProfile[] = [];
  let family: FamilyConnectionWithProfile[] = [];
  let unreadNotificationCount = 0;
  let unreadMessageCount = 0;

  if (profile) {
    [likedPostIds, savedPostIds, friendStatuses, friends, family, unreadNotificationCount, unreadMessageCount] = await Promise.all([
      getMyLikedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
      getMySavedPostIds(supabase, profile.id, postIds).then((set) => Array.from(set)),
      getMyFriendStatuses(supabase, profile.id, authorIds),
      friendsPromise!,
      familyPromise!,
      unreadCountPromise!,
      unreadMessageCountPromise!,
    ]);
  }

  return (
    <AppShell
      profile={profile}
      posts={posts}
      tags={tags}
      media={media}
      likedPostIds={likedPostIds}
      savedPostIds={savedPostIds}
      friendStatuses={friendStatuses}
      friends={friends}
      family={family}
      unreadNotificationCount={unreadNotificationCount}
      unreadMessageCount={unreadMessageCount}
    />
  );
}
