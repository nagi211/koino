"use client";

import { useState } from "react";
import { FAMILY_RELATIONSHIP_OPTIONS, sendFamilyRequest } from "@koino/core";
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
  const [status, setStatus] = useState(initialStatus);
  const [picking, setPicking] = useState(false);
  const [relationship, setRelationship] = useState<FamilyRelationship>("cousin");
  const [pending, setPending] = useState(false);

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

  if (status === "family") {
    return <p className="text-sm text-muted">Connected as family</p>;
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
