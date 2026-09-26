"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptFriendRequest, getMyFriendStatuses, removeFriendship, searchProfiles, sendFriendRequest, startDmConversation } from "@koino/core";
import type { FriendshipStatus, FriendshipWithProfile, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";
import { ProfileCard } from "./profile-card";

export function FriendsPanel({
  profile,
  initialFriends,
  initialRequests,
}: {
  profile: Profile;
  initialFriends: FriendshipWithProfile[];
  initialRequests: FriendshipWithProfile[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [resultStatuses, setResultStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [messaging, setMessaging] = useState<string | null>(null);
  const router = useRouter();

  async function handleMessage(friendId: string) {
    setMessaging(friendId);
    try {
      const conversationId = await startDmConversation(createClient(), friendId);
      router.push(`/messages?c=${conversationId}`);
    } finally {
      setMessaging(null);
    }
  }

  async function handleSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const client = createClient();
      const data = await searchProfiles(client, q, profile.id);
      setResults(data);
      setResultStatuses(await getMyFriendStatuses(client, profile.id, data.map((result) => result.id)));
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFriend(otherId: string) {
    setResultStatuses((prev) => ({ ...prev, [otherId]: "pending_sent" }));
    try {
      await sendFriendRequest(createClient(), profile.id, otherId);
    } catch {
      setResultStatuses((prev) => ({ ...prev, [otherId]: "none" }));
    }
  }

  async function handleAccept(friendshipId: string, requesterProfile: Profile) {
    setRequests((prev) => prev.filter((req) => req.friendship_id !== friendshipId));
    setFriends((prev) => [...prev, { friendship_id: friendshipId, profile: requesterProfile }]);
    try {
      await acceptFriendRequest(createClient(), friendshipId);
    } catch {
      // best-effort optimistic update; a reload will resync if this failed
    }
  }

  async function handleDecline(friendshipId: string) {
    setRequests((prev) => prev.filter((req) => req.friendship_id !== friendshipId));
    try {
      await removeFriendship(createClient(), friendshipId);
    } catch {
      // best-effort
    }
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <ProfileCard profile={profile} />
      <hr className="border-card-border" />

      <div>
        <input
          className="w-full rounded-xl border border-card-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
          placeholder="Search people…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {query && (
          <ul className="mt-3 flex flex-col gap-2">
            {searching && <li className="text-sm text-muted">Searching…</li>}
            {!searching && results.length === 0 && <li className="text-sm text-muted">No matches.</li>}
            {results.map((result) => {
              const status = resultStatuses[result.id] ?? "none";
              return (
                <li key={result.id} className="flex items-center justify-between gap-2">
                  <Link href={`/profile/${result.username}`} className="flex items-center gap-2 hover:underline">
                    <Avatar url={result.avatar_url} username={result.username} size={28} />
                    <span className="text-sm text-foreground">@{result.username}</span>
                  </Link>
                  {status === "none" ? (
                    <button
                      type="button"
                      onClick={() => handleAddFriend(result.id)}
                      className="rounded-xl bg-olive-dark px-3 py-1 text-xs font-medium text-white"
                    >
                      Add
                    </button>
                  ) : (
                    <span className="text-xs text-muted">
                      {status === "friends" ? "Friends" : status === "pending_sent" ? "Sent" : "Pending"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {requests.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
            Friend requests
          </h3>
          <ul className="flex flex-col gap-3">
            {requests.map((req) => (
              <li key={req.friendship_id} className="flex items-center justify-between gap-2">
                <Link href={`/profile/${req.profile.username}`} className="flex items-center gap-2 hover:underline">
                  <Avatar url={req.profile.avatar_url} username={req.profile.username} size={28} />
                  <span className="text-sm text-foreground">@{req.profile.username}</span>
                </Link>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAccept(req.friendship_id, req.profile)}
                    className="rounded-xl bg-olive-dark px-3 py-1 text-xs font-medium text-white"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(req.friendship_id)}
                    className="rounded-xl border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Friends</h3>
          <Link href="/friends" className="text-xs font-medium text-olive-dark hover:underline">
            Friends feed
          </Link>
        </div>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">No friends yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {friends.map((friend) => (
              <li key={friend.friendship_id} className="flex items-center justify-between gap-2">
                <Link href={`/profile/${friend.profile.username}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <Avatar url={friend.profile.avatar_url} username={friend.profile.username} size={28} />
                  <span className="truncate text-sm text-foreground">@{friend.profile.username}</span>
                </Link>
                <button
                  type="button"
                  disabled={messaging === friend.profile.id}
                  onClick={() => handleMessage(friend.profile.id)}
                  className="shrink-0 rounded-xl border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
                >
                  Message
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
