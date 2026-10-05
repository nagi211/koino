"use client";

import { useState } from "react";
import Link from "next/link";
import type { FriendshipStatus, PostWithAuthor, Profile } from "@koino/core";
import { NotificationBell } from "../../notification-bell";
import { PostActions } from "../../post-actions";
import { PostCard } from "../../post-card";
import { PostMenu } from "../../post-menu";
import { ReportModal } from "../../report-modal";
import { Sidebar } from "../../sidebar";
import { VouchGateModal } from "../../vouch-gate-modal";

export function SinglePostView({
  profile,
  post,
  likedPostIds,
  savedPostIds,
  friendStatus,
  unreadNotificationCount,
  unreadMessageCount,
  openComments,
}: {
  profile: Profile;
  post: PostWithAuthor | null;
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatus: FriendshipStatus;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  openComments: boolean;
}) {
  const [reportTarget, setReportTarget] = useState<PostWithAuthor | null>(null);
  const [vouchGateOpen, setVouchGateOpen] = useState(false);

  // Same uniform rule as every other feed: comments/reports need an active
  // account, likes are open to any non-suspended member.
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
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Back
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-foreground">Post</h1>
          <NotificationBell profile={profile} initialUnreadCount={unreadNotificationCount} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl p-3 sm:p-8">
            {post ? (
              <PostCard
                post={post}
                actions={
                  <PostActions
                    post={post}
                    profile={profile}
                    initiallyLiked={likedPostIds.includes(post.id)}
                    requireAuth={requireAuth}
                    requireEngagement={requireEngagement}
                    lightText={post.type === "text" && !!post.background}
                    initiallyOpenComments={openComments}
                  />
                }
                menu={
                  <PostMenu
                    postId={post.id}
                    authorId={post.author_id}
                    profile={profile}
                    initiallySaved={savedPostIds.includes(post.id)}
                    initialFriendStatus={friendStatus}
                    requireAuth={requireAuth}
                    onReport={() => requireAuth(() => setReportTarget(post))}
                    lightText={post.type === "text" && !!post.background}
                  />
                }
              />
            ) : (
              <p className="pt-20 text-center text-sm text-muted">
                This post isn&rsquo;t available — it may have been removed, or you may not have permission to view it.
              </p>
            )}
          </div>
        </div>
      </div>

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
  );
}
