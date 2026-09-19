"use client";

import { useState } from "react";
import type { FriendshipStatus, PostWithAuthor, Profile, StoryWithAuthor } from "@koino/core";
import { AccountMenu } from "./account-menu";
import { AuthModal } from "./auth-modal";
import { NotificationBell } from "./notification-bell";
import { PostActions } from "./post-actions";
import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";
import { PostMenu } from "./post-menu";
import { ReportModal } from "./report-modal";
import { GuestBanner } from "./guest-banner";
import { StoriesRow } from "./stories-row";
import { VouchGateModal } from "./vouch-gate-modal";

export function Feed({
  initialPosts,
  profile,
  likedPostIds,
  savedPostIds,
  friendStatuses,
  stories,
  onOpenFriends,
  unreadNotificationCount,
  vouchGateOpen,
  onOpenVouchGate,
  onCloseVouchGate,
  guestBannerKey,
}: {
  initialPosts: PostWithAuthor[];
  profile: Profile | null;
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatuses: Record<string, FriendshipStatus>;
  stories: StoryWithAuthor[];
  onOpenFriends: () => void;
  unreadNotificationCount: number;
  vouchGateOpen: boolean;
  onOpenVouchGate: () => void;
  onCloseVouchGate: () => void;
  guestBannerKey: number;
}) {
  const likedSet = new Set(likedPostIds);
  const savedSet = new Set(savedPostIds);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<PostWithAuthor | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Not logged in -> sign up. Logged in but still a guest -> the vouch gate,
  // not a silent RLS failure on submit (posting/commenting/reporting/stories
  // all require status='active'). Everyone else -> just do it.
  function requireAuth(action: () => void) {
    if (!profile) {
      setAuthMode("sign-up");
      return;
    }
    if (profile.status !== "active") {
      onOpenVouchGate();
      return;
    }
    action();
  }

  // Looser gate for likes: any non-suspended account can react (RLS matches —
  // see 0033_guest_reactions.sql), since a like is reversible and never puts a
  // guest's own text in front of anyone. Suspended accounts get no feedback
  // here, same as everywhere else their write attempts are silently inert.
  function requireEngagement(action: () => void) {
    if (!profile) {
      setAuthMode("sign-up");
      return;
    }
    if (profile.status === "suspended") return;
    action();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between bg-background px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground md:hidden">Koino</h1>
        <div className="hidden md:block" />
        {profile ? (
          <div className="flex items-center gap-3">
            {/* Sidebar has its own permanent "Say hello" entry from md: up (see
                sidebar.tsx) — this covers the gap below that, where the sidebar
                itself is hidden, so a guest who dismissed the inline banner still
                has a way back into the vouch-gate dialog. */}
            {profile.status === "pending" && (
              <button
                type="button"
                onClick={onOpenVouchGate}
                aria-label="Say hello"
                className="text-muted hover:text-foreground md:hidden"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="9" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
                  <path d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {/* Friends + bell: sidebar covers both from md: up, so these are mobile-only. */}
            <button
              type="button"
              onClick={onOpenFriends}
              aria-label="Friends"
              className="text-muted hover:text-foreground md:hidden"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round" />
                <path d="M15.5 15c2.5.3 4.5 2.2 4.5 5" strokeLinecap="round" />
              </svg>
            </button>
            <div className="md:hidden">
              <NotificationBell profile={profile} initialUnreadCount={unreadNotificationCount} />
            </div>
            {/* Account avatar: only the right-side ProfileCard (lg:block) replaces this,
                so it needs to stay up through the md-lg gap where that panel is still hidden. */}
            <div className="lg:hidden">
              <AccountMenu profile={profile} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => setAuthMode("sign-in")} className="text-muted hover:text-foreground">
              Log in
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("sign-up")}
              className="rounded-xl bg-olive-dark px-4 py-1.5 font-medium text-white shadow-sm transition hover:brightness-105"
            >
              Sign up
            </button>
          </div>
        )}
      </header>

      {profile?.status === "pending" && (
        <div className="mx-auto w-full max-w-2xl shrink-0 px-3 pb-3 pt-3 sm:px-8">
          <GuestBanner key={guestBannerKey} guestId={profile.id} onSayHello={onOpenVouchGate} />
        </div>
      )}

      <div
        className={`shrink-0 overflow-hidden transition-[max-height,opacity] duration-300 ${
          scrolled ? "max-h-0 opacity-0" : "max-h-28 opacity-100"
        }`}
      >
        <div className="mx-auto w-full max-w-2xl px-3 sm:px-8">
          <StoriesRow stories={stories} profile={profile} requireAuth={requireAuth} />
        </div>
      </div>

      <ul
        className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto"
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 10)}
      >
        {initialPosts.map((post) => (
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
                    initialFriendStatus={friendStatuses[post.author_id] ?? "none"}
                    requireAuth={requireAuth}
                    onReport={() => requireAuth(() => setReportTarget(post))}
                    lightText={post.type === "text" && !!post.background}
                  />
                }
              />
            </div>
          </li>
        ))}
        {initialPosts.length === 0 && (
          <li className="flex h-full w-full items-center justify-center">
            <p className="text-muted">No posts yet.</p>
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => requireAuth(() => setComposerOpen(true))}
        aria-label="New post"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-olive-dark text-3xl leading-none text-white shadow-lg transition hover:brightness-105"
      >
        +
      </button>

      <AuthModal open={authMode !== null} initialMode={authMode ?? "sign-up"} onClose={() => setAuthMode(null)} />

      {profile && <VouchGateModal open={vouchGateOpen} onClose={onCloseVouchGate} guestId={profile.id} />}

      {profile && (
        <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} authorId={profile.id} />
      )}

      {profile && reportTarget && (
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
