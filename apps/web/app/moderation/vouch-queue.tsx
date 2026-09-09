"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { claimVouchRequest, joinConversation, vouchForUser } from "@koino/core";
import type { VouchRequestWithGuest } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";

export function VouchQueue({ requests, leaderId }: { requests: VouchRequestWithGuest[]; leaderId: string }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(request: VouchRequestWithGuest) {
    setError(null);
    setPendingId(request.id);
    try {
      const client = createClient();
      await claimVouchRequest(client, request.id);
      if (request.conversation_id) await joinConversation(client, request.conversation_id, leaderId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  async function decide(requestId: string, approve: boolean) {
    setError(null);
    setPendingId(requestId);
    try {
      await vouchForUser(createClient(), requestId, approve);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingId(null);
    }
  }

  if (requests.length === 0) {
    return <p className="text-muted">No open vouch requests.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <ul className="flex flex-col gap-4">
        {requests.map((request) => {
          const claimedByMe = request.status === "claimed" && request.leader_id === leaderId;
          return (
            <li key={request.id} className="flex flex-col gap-3 rounded-2xl border border-card-border p-4">
              <div className="flex items-center gap-3">
                <Avatar url={request.guest.avatar_url} username={request.guest.username} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">@{request.guest.username}</span>
                {request.status === "open" && (
                  <button
                    type="button"
                    disabled={pendingId === request.id}
                    onClick={() => claim(request)}
                    className="rounded-xl bg-olive-dark px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                  >
                    Claim
                  </button>
                )}
                {claimedByMe && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pendingId === request.id}
                      onClick={() => decide(request.id, true)}
                      className="rounded-xl bg-olive-dark px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === request.id}
                      onClick={() => decide(request.id, false)}
                      className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
              {request.reason && <p className="font-serif text-sm italic text-foreground">&ldquo;{request.reason}&rdquo;</p>}
              {claimedByMe && request.conversation_id && (
                <Link href={`/messages?c=${request.conversation_id}`} className="self-start text-sm text-olive-dark hover:underline">
                  Open chat →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
