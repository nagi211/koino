import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, FamilyConnectionStatus, FamilyConnectionWithProfile, FamilyRelationship, Profile } from "../types";

type FamilyConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  relationship: FamilyRelationship;
  status: "pending" | "accepted";
};

/** Family status between `myId` and each of `otherIds` — mirrors getMyFriendStatuses. */
export async function getMyFamilyStatuses(
  client: SupabaseClient<Database>,
  myId: string,
  otherIds: string[]
): Promise<Record<string, FamilyConnectionStatus>> {
  if (otherIds.length === 0) return {};

  const { data, error } = await client
    .from("family_connections")
    .select("id, requester_id, addressee_id, relationship, status")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error) throw error;

  const map: Record<string, FamilyConnectionStatus> = {};
  for (const row of data as FamilyConnectionRow[]) {
    const otherId = row.requester_id === myId ? row.addressee_id : row.requester_id;
    if (!otherIds.includes(otherId)) continue;
    if (row.status === "accepted") map[otherId] = "family";
    else map[otherId] = row.requester_id === myId ? "pending_sent" : "pending_received";
  }
  return map;
}

export async function sendFamilyRequest(
  client: SupabaseClient<Database>,
  requesterId: string,
  addresseeId: string,
  relationship: FamilyRelationship
) {
  const { error } = await client
    .from("family_connections")
    .insert({ requester_id: requesterId, addressee_id: addresseeId, relationship });
  if (error) throw error;
}

/** RLS restricts this to the addressee. */
export async function acceptFamilyRequest(client: SupabaseClient<Database>, connectionId: string) {
  const { error } = await client.from("family_connections").update({ status: "accepted" }).eq("id", connectionId);
  if (error) throw error;
}

/** Used both to decline a pending request and to remove an accepted family connection. */
export async function removeFamilyConnection(client: SupabaseClient<Database>, connectionId: string) {
  const { error } = await client.from("family_connections").delete().eq("id", connectionId);
  if (error) throw error;
}

export async function getFamily(client: SupabaseClient<Database>, profileId: string): Promise<FamilyConnectionWithProfile[]> {
  const { data, error } = await client
    .from("family_connections")
    .select(
      "id, requester_id, relationship, requester:profiles!family_connections_requester_id_fkey(*), addressee:profiles!family_connections_addressee_id_fkey(*)"
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
  if (error) throw error;

  return (
    data as unknown as Array<{ id: string; requester_id: string; relationship: FamilyRelationship; requester: Profile; addressee: Profile }>
  ).map((row) => ({
    connection_id: row.id,
    relationship: row.relationship,
    profile: row.requester_id === profileId ? row.addressee : row.requester,
  }));
}

export async function getPendingFamilyRequests(
  client: SupabaseClient<Database>,
  profileId: string
): Promise<FamilyConnectionWithProfile[]> {
  const { data, error } = await client
    .from("family_connections")
    .select("id, relationship, requester:profiles!family_connections_requester_id_fkey(*)")
    .eq("addressee_id", profileId)
    .eq("status", "pending");
  if (error) throw error;

  return (data as unknown as Array<{ id: string; relationship: FamilyRelationship; requester: Profile }>).map((row) => ({
    connection_id: row.id,
    relationship: row.relationship,
    profile: row.requester,
  }));
}
