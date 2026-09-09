"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";

export function AccountMenu({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    setOpen(false);
    await signOut(createClient());
    router.refresh();
  }

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
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-left text-sm text-foreground hover:bg-input"
            >
              Profile
            </Link>
            {(profile.role === "leader" || profile.role === "admin") && profile.status === "active" && (
              <Link
                href="/moderation"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-left text-sm text-foreground hover:bg-input"
              >
                Moderation
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-input"
            >
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
