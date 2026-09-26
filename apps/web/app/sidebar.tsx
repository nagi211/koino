"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "./notification-bell";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" strokeLinejoin="round" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" strokeLinecap="round" />
      <path d="M15.5 15c2.5.3 4.5 2.2 4.5 5" strokeLinecap="round" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16v11H8l-4 4V5z" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
    </svg>
  );
}

// A waving hand, not a heart — hearts now mean "like" (guests can react to
// posts too, see 0033_guest_reactions.sql), so this needed to read as
// reaching out to connect instead of colliding with that.
function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 15V5.5a1.3 1.3 0 0 1 2.6 0V13" strokeLinecap="round" />
      <path d="M10.6 13V4a1.3 1.3 0 0 1 2.6 0v9.5" strokeLinecap="round" />
      <path d="M13.2 13.5V6a1.3 1.3 0 0 1 2.6 0v9" strokeLinecap="round" />
      <path
        d="M15.8 15V9a1.3 1.3 0 0 1 2.6 0v6c0 2.8-1.8 5-4.5 5H10c-1.8 0-3-.6-4-1.8l-2.3-2.9a1.15 1.15 0 0 1 1.8-1.43L7 15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.2 5.5c.7.8 1.1 1.7 1.1 2.8s-.4 2-1.1 2.8" strokeLinecap="round" />
    </svg>
  );
}

function FamilyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="6" r="2.5" />
      <circle cx="16" cy="6" r="2.5" />
      <path d="M3 20c0-3.5 2.2-6 5-6s5 2.5 5 6" strokeLinecap="round" />
      <path d="M11 20c0-3.5 2.2-6 5-6s5 2.5 5 6" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 4H5v16h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 12H9" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar({
  profile,
  onSayHello,
  unreadNotificationCount,
}: {
  profile: Profile | null;
  onSayHello: () => void;
  unreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [isRefreshing, startLogoutTransition] = useTransition();
  const loggingOut = signingOut || isRefreshing;

  async function handleLogout() {
    setSigningOut(true);
    try {
      await signOut(createClient());
    } finally {
      setSigningOut(false);
    }
    // Wrapped so `isRefreshing` stays true until the refreshed (now
    // signed-out) page actually renders, not just until signOut resolves —
    // otherwise the button looked idle again while the page underneath was
    // still showing stale signed-in content for a moment.
    startLogoutTransition(() => {
      router.refresh();
    });
  }

  function itemClass(active: boolean) {
    return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      active ? "bg-input text-foreground" : "text-muted hover:text-foreground"
    }`;
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-card-border bg-background p-4 md:flex">
      <div className="mb-6 flex items-center justify-between px-3">
        <span className="text-xl font-bold text-foreground">Koino</span>
        {profile && <NotificationBell profile={profile} initialUnreadCount={unreadNotificationCount} align="left" />}
      </div>

      <Link href="/" className={itemClass(pathname === "/")}>
        <HomeIcon />
        Home
      </Link>

      {profile && (
        <>
          {profile.status === "pending" && (
            <button type="button" onClick={onSayHello} className={itemClass(false)}>
              <WaveIcon />
              Say hello
            </button>
          )}
          <Link href="/friends" className={`${itemClass(pathname === "/friends")} lg:hidden`}>
            <FriendsIcon />
            Friends
          </Link>
          <Link href="/messages" className={itemClass(pathname === "/messages")}>
            <MessagesIcon />
            Messages
          </Link>
          <Link href="/profile" className={itemClass(pathname === "/profile")}>
            <UserIcon />
            Profile
          </Link>
          <Link href="/family" className={`${itemClass(pathname === "/family")} lg:hidden`}>
            <FamilyIcon />
            Family
          </Link>
          {(profile.role === "leader" || profile.role === "admin") && profile.status === "active" && (
            <Link href="/moderation" className={itemClass(pathname === "/moderation")}>
              <ShieldIcon />
              Moderation
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={`${itemClass(false)} mt-auto disabled:opacity-50`}
          >
            <LogOutIcon />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </>
      )}
    </aside>
  );
}
