import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, FriendshipStatus, FriendshipWithProfile } from "../types";

type FriendshipRow = { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" };

/** Friend/request status between `myId` and each of `otherIds` — drives the post menu's "Add friend" label. */
export async function getMyFriendStatuses(
  client: SupabaseClient<Database>,
  myId: string,
  otherIds: string[]
): Promise<Record<string, FriendshipStatus>> {
  if (otherIds.length === 0) return {};

  const { data, error } = await client
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error) throw error;

  const map: Record<string, FriendshipStatus> = {};
  for (const row of data as FriendshipRow[]) {
    const otherId = row.requester_id === myId ? row.addressee_id : row.requester_id;
    if (!otherIds.includes(otherId)) continue;
    if (row.status === "accepted") map[otherId] = "friends";
    else map[otherId] = row.requester_id === myId ? "pending_sent" : "pending_received";
  }
  return map;
}

export async function sendFriendRequest(client: SupabaseClient<Database>, requesterId: string, addresseeId: string) {
  const { error } = await client.from("friendships").insert({ requester_id: requesterId, addressee_id: addresseeId });
  if (error) throw error;
}

/** RLS restricts this to the addressee. */
export async function acceptFriendRequest(client: SupabaseClient<Database>, friendshipId: string) {
  const { error } = await client.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  if (error) throw error;
}

/** Used both to decline a pending request and to remove an accepted friendship. */
export async function removeFriendship(client: SupabaseClient<Database>, friendshipId: string) {
  const { error } = await client.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function getFriends(client: SupabaseClient<Database>, profileId: string): Promise<FriendshipWithProfile[]> {
  const { data, error } = await client
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)"
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
  if (error) throw error;

  return (data as unknown as Array<{ id: string; requester_id: string; requester: Profile; addressee: Profile }>).map(
    (row) => ({ friendship_id: row.id, profile: row.requester_id === profileId ? row.addressee : row.requester })
  );
}

export async function getPendingFriendRequests(
  client: SupabaseClient<Database>,
  profileId: string
): Promise<FriendshipWithProfile[]> {
  const { data, error } = await client
    .from("friendships")
    .select("id, requester:profiles!friendships_requester_id_fkey(*)")
    .eq("addressee_id", profileId)
    .eq("status", "pending");
  if (error) throw error;

  return (data as unknown as Array<{ id: string; requester: Profile }>).map((row) => ({
    friendship_id: row.id,
    profile: row.requester,
  }));
}

export async function searchProfiles(
  client: SupabaseClient<Database>,
  query: string,
  excludeId: string,
  limit = 10
): Promise<Profile[]> {
  if (!query.trim()) return [];

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .ilike("username", `%${query}%`)
    .neq("id", excludeId)
    .limit(limit);
  if (error) throw error;
  return data;
}
