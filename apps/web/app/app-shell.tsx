"use client";

import { useState } from "react";
import type { FriendshipStatus, FriendshipWithProfile, PostWithAuthor, Profile, StoryWithAuthor } from "@koino/core";
import { Feed } from "./feed";
import { FriendsPanel } from "./friends-panel";
import { Sidebar } from "./sidebar";

export function AppShell({
  profile,
  posts,
  likedPostIds,
  savedPostIds,
  friendStatuses,
  friends,
  pendingRequests,
  stories,
  unreadNotificationCount,
}: {
  profile: Profile | null;
  posts: PostWithAuthor[];
  likedPostIds: string[];
  savedPostIds: string[];
  friendStatuses: Record<string, FriendshipStatus>;
  friends: FriendshipWithProfile[];
  pendingRequests: FriendshipWithProfile[];
  stories: StoryWithAuthor[];
  unreadNotificationCount: number;
}) {
  const [friendsDrawerOpen, setFriendsDrawerOpen] = useState(false);
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
        onOpenFriends={() => setFriendsDrawerOpen(true)}
        onSayHello={openVouchGate}
        unreadNotificationCount={unreadNotificationCount}
      />

      <Feed
        initialPosts={posts}
        profile={profile}
        likedPostIds={likedPostIds}
        savedPostIds={savedPostIds}
        friendStatuses={friendStatuses}
        stories={stories}
        onOpenFriends={() => setFriendsDrawerOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        vouchGateOpen={vouchGateOpen}
        onOpenVouchGate={openVouchGate}
        onCloseVouchGate={closeVouchGate}
        guestBannerKey={guestBannerKey}
      />

      {profile && (
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-card-border bg-background p-4 lg:block">
          <FriendsPanel profile={profile} initialFriends={friends} initialRequests={pendingRequests} />
        </aside>
      )}

      {profile && friendsDrawerOpen && (
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
            <FriendsPanel profile={profile} initialFriends={friends} initialRequests={pendingRequests} />
          </div>
        </div>
      )}
    </div>
  );
}
