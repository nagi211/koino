"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function RecentPostsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 21V4" strokeLinecap="round" />
      <path d="M5 4h13l-3 4 3 4H5" strokeLinejoin="round" />
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

function PromoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l2.5 5 5.5.7-4 3.9.9 5.4-4.9-2.6-4.9 2.6.9-5.4-4-3.9 5.5-.7z" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

const ITEMS = [
  { href: "/moderation", label: "Recent posts", Icon: RecentPostsIcon },
  { href: "/moderation/reports", label: "Reports", Icon: ReportsIcon },
  { href: "/moderation/messages", label: "Message requests", Icon: MessagesIcon },
  { href: "/moderation/promote", label: "Promote members", Icon: PromoteIcon },
] as const;

// Desktop-only rail (see ModerationMobileNav below for the md:hidden
// counterpart) — this had no responsive handling at all before: a fixed
// w-56 aside, always rendered, squeezing the actual queue content into
// almost no room on a phone-width screen.
export function ModerationSidebar() {
  const pathname = usePathname();

  function itemClass(active: boolean) {
    return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      active ? "bg-input text-foreground" : "text-muted hover:text-foreground"
    }`;
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-card-border bg-background p-4 md:flex">
      <Link href="/" className="mb-6 px-3 text-xl font-bold text-foreground hover:opacity-80">
        Koino
      </Link>
      <div className="flex flex-col gap-1">
        {ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={itemClass(pathname === href)}>
            <Icon />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

// Mobile stand-in for the sidebar: a hamburger button opens a right-side
// drawer with the same 4 queues (plus a way back to the feed, since the
// sidebar's own Koino link disappears with it below md) — the same drawer
// pattern already used for Friends (app-shell.tsx) and Family
// (family-feed.tsx) on mobile, rather than introducing a new one.
export function ModerationMobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function itemClass(active: boolean) {
    return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      active ? "bg-input text-foreground" : "text-muted hover:text-foreground"
    }`;
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-card-border bg-background px-4 py-3 md:hidden">
        <span className="w-[22px]" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Moderation</span>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Moderation menu"
          className="text-muted hover:text-foreground"
        >
          <HamburgerIcon />
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto bg-background p-4 shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close"
              className="mb-2 self-end text-muted hover:text-foreground"
            >
              ✕
            </button>
            <Link href="/" onClick={() => setDrawerOpen(false)} className={itemClass(false)}>
              ← Back to Koino
            </Link>
            <div className="my-2 border-t border-card-border" />
            {ITEMS.map(({ href, label, Icon }) => (
              <Link key={href} href={href} onClick={() => setDrawerOpen(false)} className={itemClass(pathname === href)}>
                <Icon />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
