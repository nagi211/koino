"use client";

import { useState } from "react";
import Link from "next/link";
import type { FriendshipStatus, PostWithAuthor, Profile } from "@koino/core";
import { AccountMenu } from "../../../account-menu";
import { NotificationBell } from "../../../notification-bell";
import { PostActions } from "../../../post-actions";
import { PostCard } from "../../../post-card";
import { PostMenu } from "../../../post-menu";
import { ReportModal } from "../../../report-modal";
import { Sidebar } from "../../../sidebar";
import { VouchGateModal } from "../../../vouch-gate-modal";

export function ProfilePostsFeed({
  profile,
  target,
  posts,
  likedPostIds,
  savedPostIds,
  friendStatus,
  unreadNotificationCount,
  unreadMessageCount,
}: {
  profile: Profile;
  target: Profile;
  posts: PostWithAuthor[];
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatus: FriendshipStatus;
  unreadNotificationCount: number;
  unreadMessageCount: number;
}) {
  const likedSet = new Set(likedPostIds);
  const savedSet = new Set(savedPostIds);
  const [reportTarget, setReportTarget] = useState<PostWithAuthor | null>(null);
  const [vouchGateOpen, setVouchGateOpen] = useState(false);

  // Same uniform rule as every other feed (public/family/friends): comments
  // and reports need an active account, likes are open to any non-suspended
  // member. This page mixes posts across all three audiences (whatever the
  // viewer is allowed to see — see getVisiblePostsByAuthor), but the gating
  // rule is identical across all of them, so there's nothing to branch on
  // per post.
  function requireAuth(action: () => void) {
    if (profile.status !== "active") {
      setVouchGateOpen(true);
      return;
    }
    action();
  }

  function requireEngagement(action: () => void) {
    if (profile.status === "suspended") return;
    action();
  }

  return (
    <div className="fixed inset-0 flex">
      <Sidebar
        profile={profile}
        onSayHello={() => setVouchGateOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        fullNav
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex shrink-0 items-center justify-between border-b border-card-border bg-background px-4 py-3 sm:px-8">
          <Link href={`/profile/${target.username}`} className="text-sm text-muted hover:text-foreground">
            Back
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-foreground">@{target.username}&rsquo;s posts</h1>
          <div className="flex items-center gap-3">
            <NotificationBell profile={profile} initialUnreadCount={unreadNotificationCount} />
            {/* Sidebar covers this from md: up — avatar menu fills the gap below that. */}
            <div className="md:hidden">
              <AccountMenu profile={profile} unreadMessageCount={unreadMessageCount} onOpenVouchGate={() => setVouchGateOpen(true)} />
            </div>
          </div>
        </header>

        <ul className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto">
          {posts.map((post) => (
            <li key={post.id} className="flex h-full w-full snap-start justify-center p-3 sm:p-8 [scroll-snap-stop:always]">
              <div className="w-full max-w-2xl">
                <PostCard
                  post={post}
                  actions={
                    <PostActions
                      post={post}
                      profile={profile}
                      initiallyLiked={likedSet.has(post.id)}
                      requireAuth={requireAuth}
                      requireEngagement={requireEngagement}
                      lightText={post.type === "text" && !!post.background}
                    />
                  }
                  menu={
                    <PostMenu
                      postId={post.id}
                      authorId={post.author_id}
                      profile={profile}
                      initiallySaved={savedSet.has(post.id)}
                      initialFriendStatus={friendStatus}
                      requireAuth={requireAuth}
                      onReport={() => requireAuth(() => setReportTarget(post))}
                      lightText={post.type === "text" && !!post.background}
                    />
                  }
                />
              </div>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-muted">No posts yet.</p>
            </li>
          )}
        </ul>

        <VouchGateModal open={vouchGateOpen} onClose={() => setVouchGateOpen(false)} guestId={profile.id} />

        {reportTarget && (
          <ReportModal
            key={reportTarget.id}
            open
            onClose={() => setReportTarget(null)}
            reporterId={profile.id}
            targetType="post"
            targetId={reportTarget.id}
          />
        )}
      </div>
    </div>
  );
}
