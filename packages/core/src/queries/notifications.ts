import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Notification, NotificationWithActor } from "../types";

/** Used by every server component that renders a notification bell. */
export async function getUnreadNotificationCount(client: SupabaseClient<Database>, profileId: string): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", profileId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function listNotifications(
  client: SupabaseClient<Database>,
  profileId: string,
  limit = 30
): Promise<NotificationWithActor[]> {
  const { data, error } = await client
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(username, avatar_url)")
    .eq("recipient_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data as unknown as Array<Notification & { actor: { username: string; avatar_url: string | null } | null }>;
  return rows.map(({ actor, ...notification }) => ({
    ...notification,
    actor_username: actor?.username ?? null,
    actor_avatar_url: actor?.avatar_url ?? null,
  }));
}

export async function markAllNotificationsRead(client: SupabaseClient<Database>, profileId: string) {
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profileId)
    .is("read_at", null);
  if (error) throw error;
}

/**
 * Live badge updates without polling — mirrors subscribeToMessages in messages.ts,
 * except the topic includes a random suffix: unlike a conversation view (always a
 * single instance at a time), the bell renders in multiple places at once (sidebar
 * + mobile header), and createBrowserClient hands out one shared client — two
 * subscribers requesting the literal same topic name collide on the same
 * already-subscribed channel object instead of getting independent channels.
 */
export function subscribeToNotifications(
  client: SupabaseClient<Database>,
  profileId: string,
  onInsert: (notification: Notification) => void
) {
  const channel = client
    .channel(`notifications:${profileId}:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${profileId}` },
      (payload) => onInsert(payload.new as Notification)
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
