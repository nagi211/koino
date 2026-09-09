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

  return (
    <div className="fixed inset-0 flex">
      <Sidebar profile={profile} onOpenFriends={() => setFriendsDrawerOpen(true)} unreadNotificationCount={unreadNotificationCount} />

      <Feed
        initialPosts={posts}
        profile={profile}
        likedPostIds={likedPostIds}
        savedPostIds={savedPostIds}
        friendStatuses={friendStatuses}
        stories={stories}
        onOpenFriends={() => setFriendsDrawerOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
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
