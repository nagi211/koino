"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FAMILY_RELATIONSHIP_OPTIONS, sendFamilyRequest, startDmConversation } from "@koino/core";
import type { FamilyConnectionStatus, FamilyRelationship, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

export function AddFamilyButton({
  viewer,
  targetId,
  initialStatus,
}: {
  viewer: Profile;
  targetId: string;
  initialStatus: FamilyConnectionStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [picking, setPicking] = useState(false);
  const [relationship, setRelationship] = useState<FamilyRelationship>("cousin");
  const [pending, setPending] = useState(false);
  const [messagePending, setMessagePending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  async function handleSend() {
    setPending(true);
    try {
      await sendFamilyRequest(createClient(), viewer.id, targetId, relationship);
      setStatus("pending_sent");
      setPicking(false);
    } finally {
      setPending(false);
    }
  }

  async function handleMessage() {
    setMessagePending(true);
    setMessageError(null);
    try {
      const conversationId = await startDmConversation(createClient(), targetId);
      router.push(`/messages?c=${conversationId}`);
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMessagePending(false);
    }
  }

  // Family is an automatic friend for messaging too now (see
  // 0042_message_friends_and_family.sql) — a guest can message a confirmed
  // family connection, suspended is the only status that actually blocks it.
  if (status === "family") {
    return viewer.status === "suspended" ? (
      <p className="text-sm text-muted">Connected as family</p>
    ) : (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled={messagePending}
          onClick={handleMessage}
          className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
        >
          Message
        </button>
        {messageError && <p className="text-xs text-danger">{messageError}</p>}
      </div>
    );
  }
  if (status === "pending_received") {
    return <p className="text-sm text-muted">Respond in your Family panel</p>;
  }
  if (status === "pending_sent") {
    return (
      <button type="button" disabled className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted opacity-50">
        Request sent
      </button>
    );
  }

  if (picking) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
          className="rounded-xl border border-card-border bg-input px-2 py-1.5 text-sm text-foreground outline-none focus:border-olive-dark"
        >
          {FAMILY_RELATIONSHIP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={handleSend}
          className="rounded-xl bg-olive-dark px-3 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPicking(true)}
      className="rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
    >
      Add as family
    </button>
  );
}
