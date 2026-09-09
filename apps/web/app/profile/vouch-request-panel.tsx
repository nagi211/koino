"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createConversation, getMyVouchRequest, joinConversation, requestVouch, requestVouchSchema, sendMessage } from "@koino/core";
import type { VouchRequest } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

// Quick-start prompts for someone who isn't sure what to say — tapping one
// pre-fills the box with a real starter sentence, still fully editable.
const STARTERS = [
  { label: "Just curious, exploring", text: "I'm just curious and wanted to look around." },
  { label: "I have a prayer request", text: "I have something I'd like prayer for." },
  { label: "I'd like to talk to someone", text: "I'd like to talk to someone." },
  { label: "I want to join a group", text: "I'd like to find a group or circle to be part of." },
] as const;

/**
 * Guest-only "waiting room": reach out to start a conversation with a leader,
 * then wait / chat / see the outcome. Rendered under the pending-account status
 * line on the guest's own profile (see STATUS_COPY.pending in photo-panel-content.tsx)
 * and embedded directly in the feed's onboarding banner and the vouch gate modal.
 */
export function VouchRequestPanel({ guestId }: { guestId: string }) {
  const [request, setRequest] = useState<VouchRequest | null | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyVouchRequest(createClient(), guestId).then(setRequest);
  }, [guestId]);

  async function handleRequest() {
    const parsed = requestVouchSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Tell us a little about why you're here");
      return;
    }
    setRequesting(true);
    setError(null);
    try {
      const client = createClient();
      const conversation = await createConversation(client, guestId, "leader_chat");
      await joinConversation(client, conversation.id, guestId);
      const created = await requestVouch(client, guestId, conversation.id, parsed.data.reason);
      // So whoever claims this opens a chat with a real first line, not a blank slate.
      await sendMessage(client, guestId, { conversation_id: conversation.id, body: parsed.data.reason });
      setRequest(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setRequesting(false);
    }
  }

  if (request === undefined) return null;

  if (!request || request.status === "declined") {
    return (
      <div className="flex flex-col gap-2">
        {request?.status === "declined" && (
          <p className="text-xs opacity-70">
            This conversation didn&rsquo;t lead to joining the community yet — you&rsquo;re always welcome to reach out again.
          </p>
        )}
        <p className="text-xs font-medium opacity-80">What brings you here?</p>
        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((starter) => (
            <button
              key={starter.label}
              type="button"
              onClick={() => {
                setSelectedStarter(starter.label);
                setReason(starter.text);
              }}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                selectedStarter === starter.label
                  ? "border-olive-dark bg-olive/10 text-foreground"
                  : "border-card-border text-muted hover:text-foreground"
              }`}
            >
              {starter.label}
            </button>
          ))}
        </div>
        <textarea
          className="w-full rounded-xl border border-card-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
          placeholder="Say a little more…"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="button"
          disabled={requesting || !reason.trim()}
          onClick={handleRequest}
          className="self-start rounded-xl bg-olive-dark px-4 py-1.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          {requesting ? "Saying hello…" : "Say hello"}
        </button>
      </div>
    );
  }

  if (request.status === "open") {
    return <p className="text-xs opacity-70">Someone from our community will reach out soon.</p>;
  }

  // "claimed" — a leader has joined; conversation_id is always set for a request
  // that's reached this far, since the guest creates it before ever calling requestVouch.
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs opacity-70">Someone&rsquo;s here to chat — say hello!</p>
      <Link href={`/messages?c=${request.conversation_id}`} className="self-start text-sm text-olive-dark hover:underline">
        Open chat →
      </Link>
    </div>
  );
}
