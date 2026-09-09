import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, TopFriendWithProfile } from "../types";

export async function getTopFriends(
  client: SupabaseClient<Database>,
  profileId: string
): Promise<TopFriendWithProfile[]> {
  const { data, error } = await client
    .from("top_friends")
    .select("friend_id, position, profiles!top_friends_friend_id_fkey(*)")
    .eq("profile_id", profileId)
    .order("position", { ascending: true });
  if (error) throw error;

  return (data as unknown as Array<{ friend_id: string; position: number; profiles: Profile }>).map((row) => ({
    friend_id: row.friend_id,
    position: row.position,
    profile: row.profiles,
  }));
}

/** Replaces the whole list — simplest way to support reordering/adding/removing in one save. */
export async function setTopFriends(client: SupabaseClient<Database>, profileId: string, friendIds: string[]) {
  const { error: deleteError } = await client.from("top_friends").delete().eq("profile_id", profileId);
  if (deleteError) throw deleteError;

  if (friendIds.length === 0) return;

  const rows = friendIds.map((friendId, index) => ({ profile_id: profileId, friend_id: friendId, position: index }));
  const { error: insertError } = await client.from("top_friends").insert(rows);
  if (insertError) throw insertError;
}
