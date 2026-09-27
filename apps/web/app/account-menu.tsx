"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";
import { useUnreadMessageCount } from "./use-unread-message-count";

// Everything the left sidebar offers from md: up (see sidebar.tsx) — this menu
// is the mobile/tablet stand-in for that whole panel below lg:, so it carries
// the same set of destinations rather than just Profile/Moderation/Log out,
// with only the notification bell left as its own icon outside it.
export function AccountMenu({
  profile,
  unreadMessageCount: initialUnreadMessageCount,
  onOpenVouchGate,
}: {
  profile: Profile;
  unreadMessageCount: number;
  onOpenVouchGate: () => void;
}) {
  const router = useRouter();
  const unreadMessageCount = useUnreadMessageCount(profile, initialUnreadMessageCount);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isRefreshing, startLogoutTransition] = useTransition();
  const loggingOut = signingOut || isRefreshing;
  const awaitingLogoutRefresh = useRef(false);

  // Closing the menu only once the post-refresh (signed-out) page has
  // actually rendered, instead of on click — closing it immediately left the
  // menu gone but the page underneath still showing stale signed-in content
  // for a moment, which read as the tap having done nothing.
  useEffect(() => {
    if (awaitingLogoutRefresh.current && !isRefreshing) {
      awaitingLogoutRefresh.current = false;
      setOpen(false);
    }
  }, [isRefreshing]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await signOut(createClient());
    } finally {
      setSigningOut(false);
    }
    awaitingLogoutRefresh.current = true;
    startLogoutTransition(() => {
      router.refresh();
    });
  }

  const itemClass = "block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-input";

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Account menu" className="relative">
        <Avatar url={profile.avatar_url} username={profile.username} size={36} />
        {unreadMessageCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-danger ring-2 ring-background" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-card-border bg-card shadow-lg">
            <div className="border-b border-card-border px-4 py-2 font-mono text-sm text-muted">@{profile.username}</div>
            <Link href="/profile" onClick={() => setOpen(false)} className={itemClass}>
              Profile
            </Link>
            <Link href="/friends" onClick={() => setOpen(false)} className={itemClass}>
              Friends
            </Link>
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-foreground hover:bg-input"
            >
              Messages
              {unreadMessageCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium leading-none text-white">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              )}
            </Link>
            <Link href="/family" onClick={() => setOpen(false)} className={itemClass}>
              Family
            </Link>
            {profile.status === "pending" && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenVouchGate();
                }}
                className={itemClass}
              >
                Say hello
              </button>
            )}
            {(profile.role === "leader" || profile.role === "admin") && profile.status === "active" && (
              <Link href="/moderation" onClick={() => setOpen(false)} className={itemClass}>
                Moderation
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={`${itemClass} border-t border-card-border disabled:opacity-50`}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
