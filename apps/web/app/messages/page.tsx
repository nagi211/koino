import { redirect } from "next/navigation";
import { getMyProfile, getUnreadNotificationCount, listMyConversations, markMessageNotificationsRead } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { MessagesInbox } from "./messages-inbox";

export default async function MessagesPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  if (!profile) redirect("/");

  // Mirrors the notification bell's own "mark read on open" — visiting the
  // inbox is the messages-side equivalent, since there's no per-conversation
  // read state to hang this off instead (see notifications.ts).
  const [conversations, , unreadNotificationCount] = await Promise.all([
    listMyConversations(supabase, profile.id),
    markMessageNotificationsRead(supabase, profile.id),
    getUnreadNotificationCount(supabase, profile.id),
  ]);

  return <MessagesInbox conversations={conversations} profile={profile} unreadNotificationCount={unreadNotificationCount} />;
}
