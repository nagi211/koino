"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendFriendRequest, startDmConversation } from "@koino/core";
import type { FriendshipStatus, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

export function AddFriendButton({
  viewer,
  targetId,
  initialStatus,
  requireAuth,
}: {
  viewer: Profile;
  targetId: string;
  initialStatus: FriendshipStatus;
  requireAuth: (action: () => void) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("pending_sent");
    setPending(true);
    try {
      await sendFriendRequest(createClient(), viewer.id, targetId);
    } catch {
      setStatus("none");
    } finally {
      setPending(false);
    }
  }

  async function handleMessage() {
    setPending(true);
    setError(null);
    try {
      const conversationId = await startDmConversation(createClient(), targetId);
      router.push(`/messages?c=${conversationId}`);
    } catch (err) {
      // The RPC requires an active (vouched) account on the caller's side —
      // a still-pending guest can be friends with someone (see
      // 0038_friends_family_automatic.sql's reasoning) but can't yet message
      // them, so requireAuth below catches that case before this ever runs.
      // This still needs to surface anything else that goes wrong instead of
      // leaving the tap looking like it did nothing.
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (status === "friends") {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => requireAuth(handleMessage)}
          className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
        >
          Message
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
  if (status === "pending_received") {
    return <p className="text-sm text-muted">Respond in your Friends panel</p>;
  }

  return (
    <button
      type="button"
      disabled={status === "pending_sent" || pending}
      onClick={handleClick}
      className="rounded-xl bg-olive-dark px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
    >
      {status === "pending_sent" ? "Request sent" : "Add friend"}
    </button>
  );
}
