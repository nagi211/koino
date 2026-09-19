"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyVouchRequest } from "@koino/core";
import type { VouchRequest } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

function hideKey(guestId: string) {
  return `koino:hide-guest-banner:${guestId}`;
}

/**
 * Compact status line for the feed — replaces what used to be the full
 * chips+textarea+button form sitting permanently in the feed (too much space,
 * felt sticky/intrusive). The actual "Say hello" flow now lives in a dialog
 * (VouchGateModal, opened via onSayHello) — this just fetches enough state to
 * show the right one-line prompt and CTA.
 *
 * Dismissing is per-browser (localStorage), not a profile field — this is a
 * lightweight display preference, not something that needs to sync across
 * devices. Either way, the sidebar and mobile header keep a permanent "Say
 * hello" entry point (see sidebar.tsx / feed.tsx) so dismissing this never
 * strands a guest without a way back into the same dialog.
 */
export function GuestBanner({ guestId, onSayHello }: { guestId: string; onSayHello: () => void }) {
  const [request, setRequest] = useState<VouchRequest | null | undefined>(undefined);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(hideKey(guestId)) === "1";
    } catch {
      // localStorage unavailable (private mode, blocked site data) — just show the banner
      return false;
    }
  });
  // Clicking the ✕ doesn't dismiss immediately — it swaps the banner row for a
  // one-time choice, since "just for now" and "don't show again" are different
  // enough consequences to deserve asking, without needing a permanently-visible
  // second row for something only relevant right as you're dismissing.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    getMyVouchRequest(createClient(), guestId).then(setRequest);
  }, [guestId]);

  function dismissOnce() {
    setHidden(true);
  }

  function dontShowAgain() {
    try {
      localStorage.setItem(hideKey(guestId), "1");
    } catch {
      // best-effort — worst case it reappears next visit
    }
    setHidden(true);
  }

  if (request === undefined || hidden) return null;

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

  if (confirming) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5">
        <p className="min-w-0 truncate text-sm font-medium text-foreground">Hide this — just for now, or for good?</p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismissOnce}
            className="rounded-xl border border-card-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Just now
          </button>
          <button
            type="button"
            onClick={dontShowAgain}
            className="rounded-xl bg-olive-dark px-3 py-1.5 text-sm font-medium text-white shadow-sm"
          >
            Don&apos;t show again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5">
      <p className="min-w-0 truncate text-sm font-medium text-foreground">{text}</p>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Dismiss"
          className="text-muted hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
