"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@koino/core";

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

const TABS = [
  { href: "/", label: "Public", Icon: HomeIcon },
  { href: "/friends", label: "Friends", Icon: FriendsIcon },
  { href: "/family", label: "Family", Icon: FamilyIcon },
] as const;

// Lives in the same md:flex/md:hidden split as Sidebar — this is the mobile
// stand-in for switching between the three feeds the way Sidebar's own
// Home/Friends/Family links already do from md: up. Signed out visitors
// only ever get the public feed (/friends and /family redirect them back to
// "/" anyway), so this doesn't render at all without a signed-in profile.
export function FeedSwitcherTabs({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  if (!profile) return null;

  return (
    <nav className="flex shrink-0 items-center justify-around border-t border-card-border bg-background py-2 md:hidden">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium ${active ? "text-olive-dark" : "text-muted"}`}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
