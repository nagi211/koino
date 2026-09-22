"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";

// Everything the left sidebar offers from md: up (see sidebar.tsx) — this menu
// is the mobile/tablet stand-in for that whole panel below lg:, so it carries
// the same set of destinations rather than just Profile/Moderation/Log out,
// with only the notification bell left as its own icon outside it.
export function AccountMenu({
  profile,
  onOpenFriends,
  onOpenVouchGate,
}: {
  profile: Profile;
  onOpenFriends: () => void;
  onOpenVouchGate: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    setOpen(false);
    await signOut(createClient());
    router.refresh();
  }

  const itemClass = "block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-input";

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Account menu">
        <Avatar url={profile.avatar_url} username={profile.username} size={36} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-card-border bg-card shadow-lg">
            <div className="border-b border-card-border px-4 py-2 font-mono text-sm text-muted">@{profile.username}</div>
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
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenFriends();
              }}
              className={itemClass}
            >
              Friends
            </button>
            <Link href="/messages" onClick={() => setOpen(false)} className={itemClass}>
              Messages
            </Link>
            <Link href="/profile" onClick={() => setOpen(false)} className={itemClass}>
              Profile
            </Link>
            <Link href="/family" onClick={() => setOpen(false)} className={itemClass}>
              Family
            </Link>
            {(profile.role === "leader" || profile.role === "admin") && profile.status === "active" && (
              <Link href="/moderation" onClick={() => setOpen(false)} className={itemClass}>
                Moderation
              </Link>
            )}
            <button type="button" onClick={handleLogout} className={`${itemClass} border-t border-card-border`}>
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
