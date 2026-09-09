"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setProfileStatus, setProfileVerified } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Admin-only account controls, in the same "⋯" overflow-menu shape as PostMenu —
 * deliberately kept out of the casual Like/Add-friend action row (a prior version
 * put them there; account-level moderation controls next to a heart icon read as
 * an easy misclick waiting to happen, not a deliberate action). Placed in the
 * photo panel's title-row corner (see profile-screen.tsx), the same slot the
 * self-view Edit button uses — a natural "account menu" position, mutually
 * exclusive with Edit since that only ever shows for isSelf.
 */
export function AdminMemberActions({ target }: { target: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suspended = target.status === "suspended";

  async function toggleVerified() {
    const next = !target.verified;
    const confirmed = window.confirm(
      next
        ? `Verify @${target.username}? Their posts will skip the approval queue.`
        : `Un-verify @${target.username}? Their posts will need approval again.`
    );
    if (!confirmed) return;
    setOpen(false);
    setError(null);
    setPending(true);
    try {
      await setProfileVerified(createClient(), target.id, next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function toggleSuspended() {
    const suspending = !suspended;
    const confirmed = window.confirm(
      suspending
        ? `Suspend @${target.username}? They won't be able to post, comment, or message until reactivated.`
        : `Reactivate @${target.username}'s account?`
    );
    if (!confirmed) return;
    setOpen(false);
    setError(null);
    setPending(true);
    try {
      await setProfileStatus(createClient(), target.id, suspending ? "suspended" : "active");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        aria-label="Admin actions"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-muted hover:text-foreground disabled:opacity-50"
      >
        ⋯
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-card-border bg-card shadow-lg">
            {/* Verifying only matters once posting is possible at all — a guest
                (pending) can't post regardless, and a suspended member's only
                live decision is whether to let them back in. */}
            {target.status === "active" && (
              <button
                type="button"
                onClick={toggleVerified}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-input"
              >
                <ShieldCheckIcon />
                {target.verified ? "Un-verify" : "Verify"}
              </button>
            )}
            <button
              type="button"
              onClick={toggleSuspended}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-input ${suspended ? "text-foreground" : "text-danger"}`}
            >
              <BanIcon />
              {suspended ? "Reactivate" : "Suspend"}
            </button>
          </div>
        </>
      )}
      {error && <p className="absolute right-0 top-full mt-1 w-52 text-xs text-danger">{error}</p>}
    </div>
  );
}
