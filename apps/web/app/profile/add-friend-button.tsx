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
}: {
  viewer: Profile;
  targetId: string;
  initialStatus: FriendshipStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);

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
    try {
      const conversationId = await startDmConversation(createClient(), targetId);
      router.push(`/messages?c=${conversationId}`);
    } finally {
      setPending(false);
    }
  }

  if (status === "friends") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={handleMessage}
        className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
      >
        Message
      </button>
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
