"use client";

import { useState } from "react";
import Link from "next/link";
import type { FriendshipStatus, PostWithAuthor, Profile, StoryWithAuthor } from "@koino/core";
import { Feed } from "./feed";
import { ProfileCard } from "./profile-card";
import { Sidebar } from "./sidebar";

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round" />
      <path d="M15.5 15c2.5.3 4.5 2.2 4.5 5" strokeLinecap="round" />
    </svg>
  );
}

function FamilyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="6" r="2.5" />
      <circle cx="16" cy="6" r="2.5" />
      <path d="M3 20c0-3.5 2.2-6 5-6s5 2.5 5 6" strokeLinecap="round" />
      <path d="M11 20c0-3.5 2.2-6 5-6s5 2.5 5 6" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({
  profile,
  posts,
  likedPostIds,
  savedPostIds,
  friendStatuses,
  stories,
  unreadNotificationCount,
}: {
  profile: Profile | null;
  posts: PostWithAuthor[];
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatuses: Record<string, FriendshipStatus>;
  stories: StoryWithAuthor[];
  unreadNotificationCount: number;
}) {
  // Lifted out of Feed so the sidebar's own "Say hello" entry can open the same
  // dialog — a guest who dismissed the feed's inline banner still needs a
  // permanent way back in, and that entry point lives one level up from Feed.
  const [vouchGateOpen, setVouchGateOpen] = useState(false);
  // Bumped whenever the vouch gate dialog closes, so GuestBanner (which fetches
  // its own status on mount and has no other way to learn a request was just
  // submitted) remounts with a fresh fetch instead of showing a stale prompt.
  const [guestBannerKey, setGuestBannerKey] = useState(0);

  function openVouchGate() {
    setVouchGateOpen(true);
  }
  function closeVouchGate() {
    setVouchGateOpen(false);
    setGuestBannerKey((k) => k + 1);
  }

  const quickLinkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground";

  return (
    <div className="fixed inset-0 flex">
      <Sidebar profile={profile} onSayHello={openVouchGate} unreadNotificationCount={unreadNotificationCount} />

      <Feed
        initialPosts={posts}
        profile={profile}
        likedPostIds={likedPostIds}
        savedPostIds={savedPostIds}
        friendStatuses={friendStatuses}
        stories={stories}
        unreadNotificationCount={unreadNotificationCount}
        vouchGateOpen={vouchGateOpen}
        onOpenVouchGate={openVouchGate}
        onCloseVouchGate={closeVouchGate}
        guestBannerKey={guestBannerKey}
      />

      {profile && (
        <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-card-border bg-background p-4 lg:flex">
          <ProfileCard profile={profile} />
          <hr className="border-card-border" />
          {/* Friends and Family both live on their own pages now (see
              sidebar.tsx, which hides their entries here at lg: since this
              panel replaces them) — just quick links, not the full
              search/requests UI those pages already have via their own
              hamburger drawer. */}
          <div className="flex flex-col gap-1">
            <Link href="/friends" className={quickLinkClass}>
              <FriendsIcon />
              Friends feed
            </Link>
            <Link href="/family" className={quickLinkClass}>
              <FamilyIcon />
              Family
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
