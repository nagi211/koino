import { notFound, redirect } from "next/navigation";
import type { FamilyConnectionStatus, FriendshipStatus } from "@koino/core";
import {
  getFriends,
  getLatestApprovedPost,
  getMyFamilyStatuses,
  getMyFriendStatuses,
  getMyProfile,
  getProfileByUsername,
  getProfileComments,
  getProfileStats,
  getTopFriends,
  getUnreadNotificationCount,
  hasLikedProfile,
  recordProfileView,
} from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { ProfileScreen } from "../profile-screen";

export default async function ProfileByUsernamePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const [viewer, target] = await Promise.all([getMyProfile(supabase), getProfileByUsername(supabase, username)]);
  if (!target) notFound();

  if (!viewer) redirect("/");

  const isSelf = viewer.id === target.id;

  const [topFriends, wallComments, targetFriends, friendStatuses, familyStatuses, latestPost, stats, liked, unreadNotificationCount] =
    await Promise.all([
      getTopFriends(supabase, target.id),
      getProfileComments(supabase, target.id),
      getFriends(supabase, target.id),
      !isSelf
        ? getMyFriendStatuses(supabase, viewer.id, [target.id])
        : Promise.resolve({} as Record<string, FriendshipStatus>),
      !isSelf
        ? getMyFamilyStatuses(supabase, viewer.id, [target.id])
        : Promise.resolve({} as Record<string, FamilyConnectionStatus>),
      getLatestApprovedPost(supabase, target.id),
      getProfileStats(supabase, target.id),
      !isSelf ? hasLikedProfile(supabase, target.id, viewer.id) : Promise.resolve(false),
      getUnreadNotificationCount(supabase, viewer.id),
      // Best-effort — a failed view record shouldn't block rendering the
      // profile, and it doesn't need to finish before anything else here
      // either, so it runs alongside the rest instead of ahead of them.
      !isSelf ? recordProfileView(supabase, target.id, viewer.id).catch(() => {}) : Promise.resolve(),
    ]);

  return (
    <ProfileScreen
      viewer={viewer}
      target={target}
      isSelf={isSelf}
      topFriends={topFriends}
      wallComments={wallComments}
      myFriends={isSelf ? targetFriends : []}
      friendCount={targetFriends.length}
      friendStatus={friendStatuses[target.id] ?? "none"}
      familyStatus={familyStatuses[target.id] ?? "none"}
      latestPost={latestPost}
      likeCount={stats.likeCount}
      viewerCount={stats.viewerCount}
      totalViewCount={stats.totalViewCount}
      initiallyLiked={liked}
      unreadNotificationCount={unreadNotificationCount}
    />
  );
}