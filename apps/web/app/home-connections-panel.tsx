"use client";

import { useState } from "react";
import Link from "next/link";
import { getMyFriendStatuses, searchProfiles, sendFriendRequest } from "@koino/core";
import type { FamilyConnectionWithProfile, FriendshipStatus, FriendshipWithProfile, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";
import { ProfileCard } from "./profile-card";

// Short previews only — the full lists (plus requests, search-and-add-as-
// family, messaging, etc.) live on /friends and /family themselves, reached
// via "See more" below.
const PREVIEW_COUNT = 5;

export function HomeConnectionsPanel({
  profile,
  friends,
  family,
}: {
  profile: Profile;
  friends: FriendshipWithProfile[];
  family: FamilyConnectionWithProfile[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [resultStatuses, setResultStatuses] = useState<Record<string, FriendshipStatus>>({});
  const [searching, setSearching] = useState(false);

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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Friends</h3>
          <Link href="/friends" className="text-xs font-medium text-olive-dark hover:underline">
            See more
          </Link>
        </div>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">No friends yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.slice(0, PREVIEW_COUNT).map((friend) => (
              <li key={friend.friendship_id}>
                <Link href={`/profile/${friend.profile.username}`} className="flex items-center gap-2 hover:underline">
                  <Avatar url={friend.profile.avatar_url} username={friend.profile.username} size={28} />
                  <span className="truncate text-sm text-foreground">@{friend.profile.username}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Family</h3>
          <Link href="/family" className="text-xs font-medium text-olive-dark hover:underline">
            See more
          </Link>
        </div>
        {family.length === 0 ? (
          <p className="text-sm text-muted">No family connections yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {family.slice(0, PREVIEW_COUNT).map((member) => (
              <li key={member.connection_id}>
                <Link href={`/profile/${member.profile.username}`} className="flex items-center gap-2 hover:underline">
                  <Avatar url={member.profile.avatar_url} username={member.profile.username} size={28} />
                  <span className="truncate text-sm text-foreground">
                    @{member.profile.username} <span className="text-muted">· {member.relationshipLabel}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
