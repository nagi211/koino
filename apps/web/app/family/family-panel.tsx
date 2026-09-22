"use client";

import { useState } from "react";
import Link from "next/link";
import {
  acceptFamilyRequest,
  FAMILY_RELATIONSHIP_OPTIONS,
  getMyFamilyStatuses,
  removeFamilyConnection,
  searchProfiles,
  sendFamilyRequest,
} from "@koino/core";
import type { FamilyConnectionStatus, FamilyConnectionWithProfile, FamilyRelationship, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";
import { ProfileCard } from "../profile-card";

export function FamilyPanel({
  profile,
  initialFamily,
  initialRequests,
}: {
  profile: Profile;
  initialFamily: FamilyConnectionWithProfile[];
  initialRequests: FamilyConnectionWithProfile[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [resultStatuses, setResultStatuses] = useState<Record<string, FamilyConnectionStatus>>({});
  const [searching, setSearching] = useState(false);
  const [family, setFamily] = useState(initialFamily);
  const [requests, setRequests] = useState(initialRequests);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<FamilyRelationship>("cousin");

  async function handleSearch(q: string) {
    setQuery(q);
    setPickingFor(null);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const client = createClient();
      const data = await searchProfiles(client, q, profile.id);
      setResults(data);
      setResultStatuses(await getMyFamilyStatuses(client, profile.id, data.map((result) => result.id)));
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(otherId: string) {
    setResultStatuses((prev) => ({ ...prev, [otherId]: "pending_sent" }));
    setPickingFor(null);
    try {
      await sendFamilyRequest(createClient(), profile.id, otherId, relationship);
    } catch {
      setResultStatuses((prev) => ({ ...prev, [otherId]: "none" }));
    }
  }

  async function handleAccept(req: FamilyConnectionWithProfile) {
    setRequests((prev) => prev.filter((r) => r.connection_id !== req.connection_id));
    setFamily((prev) => [...prev, req]);
    try {
      await acceptFamilyRequest(createClient(), req.connection_id);
    } catch {
      // best-effort optimistic update; a reload will resync if this failed
    }
  }

  async function handleDecline(connectionId: string) {
    setRequests((prev) => prev.filter((r) => r.connection_id !== connectionId));
    try {
      await removeFamilyConnection(createClient(), connectionId);
    } catch {
      // best-effort
    }
  }

  async function handleRemove(connectionId: string) {
    setFamily((prev) => prev.filter((f) => f.connection_id !== connectionId));
    try {
      await removeFamilyConnection(createClient(), connectionId);
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
                <li key={result.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/profile/${result.username}`} className="flex items-center gap-2 hover:underline">
                      <Avatar url={result.avatar_url} username={result.username} size={28} />
                      <span className="text-sm text-foreground">@{result.username}</span>
                    </Link>
                    {status === "none" ? (
                      pickingFor === result.id ? null : (
                        <button
                          type="button"
                          onClick={() => setPickingFor(result.id)}
                          className="rounded-xl bg-olive-dark px-3 py-1 text-xs font-medium text-white"
                        >
                          Add as family
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-muted">
                        {status === "family" ? "Family" : status === "pending_sent" ? "Sent" : "Pending"}
                      </span>
                    )}
                  </div>
                  {pickingFor === result.id && (
                    <div className="flex items-center gap-2 pl-9">
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
                        className="rounded-xl border border-card-border bg-input px-2 py-1 text-xs text-foreground outline-none focus:border-olive-dark"
                      >
                        {FAMILY_RELATIONSHIP_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSendRequest(result.id)}
                        className="rounded-xl bg-olive-dark px-3 py-1 text-xs font-medium text-white"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {requests.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Family requests</h3>
          <ul className="flex flex-col gap-3">
            {requests.map((req) => (
              <li key={req.connection_id} className="flex items-center justify-between gap-2">
                <Link href={`/profile/${req.profile.username}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <Avatar url={req.profile.avatar_url} username={req.profile.username} size={28} />
                  <span className="truncate text-sm text-foreground">
                    @{req.profile.username} <span className="text-muted">· {req.relationshipLabel}</span>
                  </span>
                </Link>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleAccept(req)}
                    className="rounded-xl bg-olive-dark px-3 py-1 text-xs font-medium text-white"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(req.connection_id)}
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
        <h3 className="mb-2 text-sm font-semibold text-foreground">Family</h3>
        {family.length === 0 ? (
          <p className="text-sm text-muted">No family connections yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {family.map((f) => (
              <li key={f.connection_id} className="flex items-center justify-between gap-2">
                <Link href={`/profile/${f.profile.username}`} className="flex min-w-0 items-center gap-2 hover:underline">
                  <Avatar url={f.profile.avatar_url} username={f.profile.username} size={28} />
                  <span className="truncate text-sm text-foreground">
                    @{f.profile.username} <span className="text-muted">· {f.relationshipLabel}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemove(f.connection_id)}
                  className="shrink-0 rounded-xl border border-card-border px-3 py-1 text-xs text-muted hover:text-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
