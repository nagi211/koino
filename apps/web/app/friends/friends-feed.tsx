"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FriendshipStatus, FriendshipWithProfile, PostWithAuthor, Profile } from "@koino/core";
import { NotificationBell } from "../notification-bell";
import { FriendsPanel } from "../friends-panel";
import { PostActions } from "../post-actions";
import { PostCard } from "../post-card";
import { PostComposer } from "../post-composer";
import { PostMenu } from "../post-menu";
import { ReportModal } from "../report-modal";
import { VouchGateModal } from "../vouch-gate-modal";

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function FriendsFeed({
  profile,
  posts,
  likedPostIds,
  savedPostIds,
  friendStatuses,
  initialFriends,
  initialRequests,
  unreadNotificationCount,
}: {
  profile: Profile;
  posts: PostWithAuthor[];
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatuses: Record<string, FriendshipStatus>;
  initialFriends: FriendshipWithProfile[];
  initialRequests: FriendshipWithProfile[];
  unreadNotificationCount: number;
}) {
  const likedSet = new Set(likedPostIds);
  const savedSet = new Set(savedPostIds);
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<PostWithAuthor | null>(null);
  const [vouchGateOpen, setVouchGateOpen] = useState(false);
  const searchParams = useSearchParams();
  // On mobile the friends panel lives behind a drawer, not always on screen
  // like it is on desktop (lg:block aside below) — a notification linking
  // here (e.g. "sent you a friend request") should still land the viewer
  // directly on the panel with the request, not just the post feed. See
  // family-feed.tsx for the full history behind this exact pattern —
  // notification-bell.tsx puts the notification's own id in "requests" so
  // every notification's link is genuinely distinct, which is what lets a
  // second, later notification reopen the drawer too.
  const [friendsDrawerOpen, setFriendsDrawerOpen] = useState(() => searchParams.get("requests") !== null);
  const appliedRequestsParam = useRef<string | null>(null);
  useEffect(() => {
    const requestsParam = searchParams.get("requests");
    if (requestsParam === null || requestsParam === appliedRequestsParam.current) return;
    appliedRequestsParam.current = requestsParam;
    setFriendsDrawerOpen((current) => current || true);
  }, [searchParams]);

  // Unlike family (a real-world relationship that predates the app, so it
  // gets a carve-out from the vouch gate — see 0032/0036), a friend here is
  // just a mutual add between two profiles with no built-in trust, so
  // posting/commenting/reporting to friends follows the same active-only
  // rule as the public feed.
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
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex shrink-0 items-center justify-between border-b border-card-border bg-background px-4 py-3 sm:px-8">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Back
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-foreground">Friends</h1>
          <div className="flex items-center gap-3">
            <NotificationBell profile={profile} initialUnreadCount={unreadNotificationCount} />
            <button
              type="button"
              onClick={() => setFriendsDrawerOpen(true)}
              aria-label="Friends menu"
              className="text-muted hover:text-foreground lg:hidden"
            >
              <HamburgerIcon />
            </button>
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
          {posts.length === 0 && (
            <li className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-muted">No friends posts yet.</p>
              <p className="max-w-xs text-sm text-muted">
                Posts you share here are only visible to your confirmed friends who aren&rsquo;t already family.
              </p>
            </li>
          )}
        </ul>

        <button
          type="button"
          onClick={() => requireAuth(() => setComposerOpen(true))}
          aria-label="New friends post"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-olive-dark text-3xl leading-none text-white shadow-lg transition hover:brightness-105"
        >
          +
        </button>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-card-border bg-background p-4 lg:block">
        <FriendsPanel profile={profile} initialFriends={initialFriends} initialRequests={initialRequests} />
      </aside>

      {friendsDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFriendsDrawerOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-background p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setFriendsDrawerOpen(false)}
              aria-label="Close"
              className="mb-2 self-end text-muted hover:text-foreground"
            >
              ✕
            </button>
            <FriendsPanel profile={profile} initialFriends={initialFriends} initialRequests={initialRequests} />
          </div>
        </div>
      )}

      <VouchGateModal open={vouchGateOpen} onClose={() => setVouchGateOpen(false)} guestId={profile.id} />

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} authorId={profile.id} audience="friends" />

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
