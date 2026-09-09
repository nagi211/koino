"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { endorseForLeader, setProfileRole } from "@koino/core";
import type { PromotionCandidate } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../../avatar";

export function PromoteQueue({ candidates, isAdmin }: { candidates: PromotionCandidate[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function endorse(candidateId: string, username: string) {
    if (!window.confirm(`Endorse @${username} for leader? This can't be undone, and once 2 endorsements are in they're promoted immediately.`)) return;
    setError(null);
    setPendingId(candidateId);
    try {
      await endorseForLeader(createClient(), candidateId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  async function promoteNow(candidateId: string, username: string) {
    if (!window.confirm(`Promote @${username} to leader immediately, skipping endorsements?`)) return;
    setError(null);
    setPendingId(candidateId);
    try {
      await setProfileRole(createClient(), candidateId, "leader");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (candidates.length === 0) {
    return <p className="text-muted">No members eligible to promote right now.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="flex flex-col gap-4">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex flex-col gap-2 rounded-2xl border border-card-border p-4">
            <div className="flex items-center gap-3">
              <Avatar url={candidate.avatar_url} username={candidate.username} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">@{candidate.username}</p>
                <p className="text-xs text-muted">
                  {candidate.endorsementCount}/2 endorsed
                  {candidate.endorserUsernames.length > 0 && ` — by ${candidate.endorserUsernames.map((u) => `@${u}`).join(", ")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={pendingId === candidate.id || candidate.endorsedByMe}
                  onClick={() => endorse(candidate.id, candidate.username)}
                  className="rounded-xl bg-olive-dark px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                >
                  {candidate.endorsedByMe ? "Endorsed" : "Endorse"}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={pendingId === candidate.id}
                    onClick={() => promoteNow(candidate.id, candidate.username)}
                    className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                  >
                    Promote now
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
