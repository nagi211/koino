"use client";

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

const ITEMS = [
  { href: "/moderation", label: "Recent posts", Icon: RecentPostsIcon },
  { href: "/moderation/reports", label: "Reports", Icon: ReportsIcon },
  { href: "/moderation/messages", label: "Message requests", Icon: MessagesIcon },
  { href: "/moderation/promote", label: "Promote members", Icon: PromoteIcon },
] as const;

export function ModerationSidebar() {
  const pathname = usePathname();

  function itemClass(active: boolean) {
    return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      active ? "bg-input text-foreground" : "text-muted hover:text-foreground"
    }`;
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-card-border bg-background p-4">
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
