"use client";

import { useState } from "react";
import type { FamilyConnectionWithProfile, FriendshipStatus, FriendshipWithProfile, PostWithAuthor, Profile, StoryWithAuthor } from "@koino/core";
import { Feed } from "./feed";
import { HomeConnectionsPanel } from "./home-connections-panel";
import { Sidebar } from "./sidebar";

export function AppShell({
  profile,
  posts,
  likedPostIds,
  savedPostIds,
  friendStatuses,
  friends,
  family,
  stories,
  unreadNotificationCount,
  unreadMessageCount,
}: {
  profile: Profile | null;
  posts: PostWithAuthor[];
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatuses: Record<string, FriendshipStatus>;
  friends: FriendshipWithProfile[];
  family: FamilyConnectionWithProfile[];
  stories: StoryWithAuthor[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
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

  return (
    <div className="fixed inset-0 flex">
      <Sidebar
        profile={profile}
        onSayHello={openVouchGate}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
      />

      <Feed
        initialPosts={posts}
        profile={profile}
        likedPostIds={likedPostIds}
        savedPostIds={savedPostIds}
        friendStatuses={friendStatuses}
        stories={stories}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        vouchGateOpen={vouchGateOpen}
        onOpenVouchGate={openVouchGate}
        onCloseVouchGate={closeVouchGate}
        guestBannerKey={guestBannerKey}
      />

      {profile && (
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-card-border bg-background p-4 lg:block">
          <HomeConnectionsPanel profile={profile} friends={friends} family={family} />
        </aside>
      )}
    </div>
  );
}
