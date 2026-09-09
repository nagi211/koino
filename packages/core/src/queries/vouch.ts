import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, VouchRequest, VouchRequestWithGuest } from "../types";

/**
 * A pending (guest) profile reaches out. The caller must have already created and
 * joined the leader_chat conversation it's paired with — a leader who later claims
 * this request joins that same conversation to talk with the guest. `reason` is
 * the guest's own words on why they're here, shown to leaders before they claim.
 */
export async function requestVouch(
  client: SupabaseClient<Database>,
  guestId: string,
  conversationId: string,
  reason: string
): Promise<VouchRequest> {
  const { data, error } = await client
    .from("vouch_requests")
    .insert({ guest_id: guestId, conversation_id: conversationId, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** The guest's own most recent vouch request, if any — drives their waiting-room UI. */
export async function getMyVouchRequest(client: SupabaseClient<Database>, guestId: string): Promise<VouchRequest | null> {
  const { data, error } = await client
    .from("vouch_requests")
    .select("*")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Every request a leader can currently act on: still-open ones (anyone can claim)
 * plus ones they've already claimed themselves (to resume chatting / approve or
 * decline) — matches the "leaders see open or assigned vouch requests" RLS policy.
 */
export async function listVouchRequestsForLeader(client: SupabaseClient<Database>, leaderId: string): Promise<VouchRequestWithGuest[]> {
  const { data, error } = await client
    .from("vouch_requests")
    .select("*, guest:profiles!vouch_requests_guest_id_fkey(*)")
    .or(`status.eq.open,leader_id.eq.${leaderId}`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as Array<VouchRequest & { guest: Profile }>).map(({ guest, ...request }) => ({ ...request, guest }));
}

/** Leader claims an open request so it isn't double-booked. */
export async function claimVouchRequest(client: SupabaseClient<Database>, requestId: string) {
  const { error } = await client.rpc("claim_vouch_request", { request_id: requestId });
  if (error) throw error;
}

/** The only path that activates a pending profile into a full member. */
export async function vouchForUser(client: SupabaseClient<Database>, requestId: string, approve: boolean) {
  const { error } = await client.rpc("vouch_for_user", { request_id: requestId, approve });
  if (error) throw error;
}
