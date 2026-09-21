"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead, subscribeToNotifications } from "@koino/core";
import type { NotificationWithActor, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";

const TYPE_COPY: Record<NotificationWithActor["type"], string> = {
  post_like: "liked your post",
  post_comment: "commented on your post",
  profile_like: "liked your profile",
  profile_comment: "posted on your wall",
  friend_request: "sent you a friend request",
  friend_accept: "accepted your friend request",
  family_request: "wants to connect as family",
  family_accept: "confirmed you as family",
  vouch_claimed: "reached out to get to know you",
  vouch_approved: "welcomed you into the community!",
  vouch_declined: "wasn't able to continue the conversation that time",
  new_message: "sent you a message",
  promoted_to_leader: "vouched you in as a leader — congratulations!",
};

function targetHref(notification: NotificationWithActor): string {
  if (notification.type === "post_like" || notification.type === "post_comment") return "/";
  if (notification.type === "vouch_claimed" || notification.type === "new_message") {
    // Both always carry a conversation_id (set when the notification is created —
    // see 0019_notifications.sql / 0023's claim_vouch_request and the messages trigger).
    return notification.conversation_id ? `/messages?c=${notification.conversation_id}` : "/messages";
  }
  if (notification.type === "vouch_approved" || notification.type === "vouch_declined" || notification.type === "promoted_to_leader") return "/profile";
  // Unlike friends (no standalone page — the FriendsPanel already sits
  // permanently in the home sidebar/drawer), family has its own /family page,
  // so a family notification should land there instead of the actor's
  // profile. ?requests=1 opens the mobile drawer straight to the panel that
  // has the pending/just-accepted request (see family-feed.tsx).
  if (notification.type === "family_request" || notification.type === "family_accept") return "/family?requests=1";
  return notification.actor_username ? `/profile/${notification.actor_username}` : "/profile";
}

export function NotificationBell({
  profile,
  initialUnreadCount,
  bordered = false,
  iconColor = null,
  align = "right",
}: {
  profile: Profile;
  initialUnreadCount: number;
  /** Wrap the bell in the same bordered-circle button style as the profile page's
   * "⋯" menu, instead of the bare icon used in the sidebar/mobile header — for
   * contexts where it sits directly beside that button and needs matching weight. */
  bordered?: boolean;
  /** Matches the profile navbar's customizable icon color; only used when bordered. */
  iconColor?: string | null;
  /** Which edge of the dropdown lines up with the button. "right" (default) suits
   * a bell near the right side of its row; the main Sidebar's bell sits near the
   * left edge of the whole viewport, where a right-aligned (i.e. left-extending)
   * dropdown would run off-screen — pass "left" there so it opens rightward instead. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationWithActor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after marking notifications read to force the effect below to tear
  // down and recreate its subscription — confirmed live that the postgres_changes
  // channel otherwise stops receiving INSERT broadcasts after an UPDATE happens
  // against this same table/recipient (a fresh subscription reliably works; the
  // existing one silently goes quiet server-side with no client-visible error).
  const [subscriptionGeneration, setSubscriptionGeneration] = useState(0);

  useEffect(() => {
    return subscribeToNotifications(createClient(), profile.id, () => {
      getUnreadNotificationCount(createClient(), profile.id).then(setUnreadCount);
      setNotifications(null); // stale — refetch next time the dropdown opens
    });
  }, [profile.id, subscriptionGeneration]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next || notifications) return;
    setLoading(true);
    setError(null);
    try {
      const client = createClient();
      setNotifications(await listNotifications(client, profile.id));
      await markAllNotificationsRead(client, profile.id);
      setUnreadCount(0);
      setSubscriptionGeneration((g) => g + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // "block" on the unbordered variant matters: this button sits two <div>s deep
  // (for the dropdown), so unlike a sibling icon-button that's a direct flex
  // child (auto-blockified by the flex spec), this one keeps its default
  // inline-block display — which picks up a line-box/descender gap from its
  // block-level wrapper and renders a few px taller than it actually is,
  // throwing off vertical centering next to the other header icons.
  const buttonClass = bordered
    ? `flex h-9 w-9 items-center justify-center rounded-full border hover:opacity-80 ${iconColor ? "" : "border-card-border text-muted"}`
    : "block text-muted hover:text-foreground";
  const buttonStyle = bordered && iconColor ? { borderColor: iconColor, color: iconColor } : undefined;

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={handleToggle} aria-label="Notifications" className={`relative ${buttonClass}`} style={buttonStyle}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 18.5a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-card-border bg-card shadow-lg ${
              align === "left" ? "left-0" : "right-0"
            }`}
          >
            {loading && <p className="p-4 text-sm text-muted">Loading…</p>}
            {error && <p className="p-4 text-sm text-danger">{error}</p>}
            {notifications && notifications.length === 0 && <p className="p-4 text-sm text-muted">No notifications yet.</p>}
            {notifications && notifications.length > 0 && (
              <ul className="flex flex-col">
                {notifications.map((notification) => (
                  <li key={notification.id} className="border-b border-card-border last:border-0">
                    <Link
                      href={targetHref(notification)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-input"
                    >
                      <Avatar url={notification.actor_avatar_url} username={notification.actor_username ?? "?"} size={32} />
                      <span className="min-w-0 flex-1 text-sm text-foreground">
                        {notification.actor_username && <span className="font-medium">@{notification.actor_username} </span>}
                        {TYPE_COPY[notification.type]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
