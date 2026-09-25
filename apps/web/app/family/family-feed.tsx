"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FamilyConnectionWithProfile, FriendshipStatus, PostWithAuthor, Profile } from "@koino/core";
import { NotificationBell } from "../notification-bell";
import { PostActions } from "../post-actions";
import { PostCard } from "../post-card";
import { PostComposer } from "../post-composer";
import { PostMenu } from "../post-menu";
import { ReportModal } from "../report-modal";
import { VouchGateModal } from "../vouch-gate-modal";
import { FamilyPanel } from "./family-panel";

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function FamilyFeed({
  profile,
  posts,
  likedPostIds,
  savedPostIds,
  friendStatuses,
  initialFamily,
  initialRequests,
  unreadNotificationCount,
}: {
  profile: Profile;
  posts: PostWithAuthor[];
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatuses: Record<string, FriendshipStatus>;
  initialFamily: FamilyConnectionWithProfile[];
  initialRequests: FamilyConnectionWithProfile[];
  unreadNotificationCount: number;
}) {
  const likedSet = new Set(likedPostIds);
  const savedSet = new Set(savedPostIds);
  const [composerOpen, setComposerOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<PostWithAuthor | null>(null);
  const [vouchGateOpen, setVouchGateOpen] = useState(false);
  const searchParams = useSearchParams();
  // On mobile the family panel lives behind a drawer, not always on screen like
  // it is on desktop (lg:block aside below) — a notification linking here (e.g.
  // "wants to connect as family") should still land the viewer directly on the
  // panel with the request, not just the post feed.
  const [familyDrawerOpen, setFamilyDrawerOpen] = useState(() => searchParams.get("requests") !== null);
  // The lazy initializer above only runs once, on mount — if this page is
  // already mounted (e.g. tapping a family notification from the bell while
  // already on /family) Next.js reuses the instance and just updates the
  // query string, so the initializer never re-fires and the drawer silently
  // never opens. This reacts to the param on every change after mount.
  // Every family notification links to the same literal "?requests=1" (not a
  // per-notification id) — memoizing on THAT string would make exactly one
  // notification tap per page load work and silently eat every one after it.
  // useSearchParams() hands back a new object on every real navigation
  // though (confirmed: this is why the effect re-fires for a repeat "1" at
  // all), so memoize on that reference instead — correct, and still
  // structured the way this repo's react-hooks/set-state-in-effect rule wants.
  const appliedSearchParams = useRef<ReturnType<typeof useSearchParams> | null>(null);
  useEffect(() => {
    if (searchParams.get("requests") === null || searchParams === appliedSearchParams.current) return;
    appliedSearchParams.current = searchParams;
    setFamilyDrawerOpen((current) => current || true);
  }, [searchParams]);

  // Commenting/reporting still require an active account, same as the public
  // feed — only *posting* and *liking* within family are open to any
  // non-suspended member (see 0033_guest_reactions.sql).
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

  const canPost = profile.status !== "suspended";

  return (
    <div className="fixed inset-0 flex">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex shrink-0 items-center justify-between border-b border-card-border bg-background px-4 py-3 sm:px-8">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Back
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-foreground">Family</h1>
          <div className="flex items-center gap-3">
            {/* Family tree link now lives inside FamilyPanel's own "Family"
                section (desktop aside / mobile drawer both render it), so
                there's nothing tree-related left to duplicate up here. */}
            <NotificationBell profile={profile} initialUnreadCount={unreadNotificationCount} />
            <button
              type="button"
              onClick={() => setFamilyDrawerOpen(true)}
              aria-label="Family menu"
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
              <p className="text-muted">No family posts yet.</p>
              <p className="max-w-xs text-sm text-muted">
                Posts you share here are only visible to your confirmed family connections.
              </p>
            </li>
          )}
        </ul>

        {canPost && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label="New family post"
            className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-olive-dark text-3xl leading-none text-white shadow-lg transition hover:brightness-105"
          >
            +
          </button>
        )}
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-card-border bg-background p-4 lg:block">
        <FamilyPanel profile={profile} initialFamily={initialFamily} initialRequests={initialRequests} />
      </aside>

      {familyDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFamilyDrawerOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto bg-background p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setFamilyDrawerOpen(false)}
              aria-label="Close"
              className="mb-2 self-end text-muted hover:text-foreground"
            >
              ✕
            </button>
            <FamilyPanel profile={profile} initialFamily={initialFamily} initialRequests={initialRequests} />
          </div>
        </div>
      )}

      <VouchGateModal open={vouchGateOpen} onClose={() => setVouchGateOpen(false)} guestId={profile.id} />

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} authorId={profile.id} audience="family" />

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
