"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyVouchRequest } from "@koino/core";
import type { VouchRequest } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

/**
 * Compact status line for the feed — replaces what used to be the full
 * chips+textarea+button form sitting permanently in the feed (too much space,
 * felt sticky/intrusive). The actual "Say hello" flow now lives in a dialog
 * (VouchGateModal, opened via onSayHello) — this just fetches enough state to
 * show the right one-line prompt and CTA.
 */
export function GuestBanner({ guestId, onSayHello }: { guestId: string; onSayHello: () => void }) {
  const [request, setRequest] = useState<VouchRequest | null | undefined>(undefined);

  useEffect(() => {
    getMyVouchRequest(createClient(), guestId).then(setRequest);
  }, [guestId]);

  if (request === undefined) return null;

  let text: string;
  let action: React.ReactNode = null;

  if (!request || request.status === "declined") {
    text = request?.status === "declined" ? "Want to try again? We'd love to get to know you." : "New here? We'd love to get to know you.";
    action = (
      <button
        type="button"
        onClick={onSayHello}
        className="shrink-0 rounded-xl bg-olive-dark px-3 py-1.5 text-sm font-medium text-white shadow-sm"
      >
        Say hello
      </button>
    );
  } else if (request.status === "open") {
    text = "Your message is waiting for a leader to see it.";
  } else {
    // "claimed" — conversation_id is always set for a request that's reached this far.
    text = "Someone's here to chat!";
    action = (
      <Link href={`/messages?c=${request.conversation_id}`} className="shrink-0 text-sm font-medium text-olive-dark hover:underline">
        Open chat →
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5">
      <p className="min-w-0 truncate text-sm font-medium text-foreground">{text}</p>
      {action}
    </div>
  );
}
