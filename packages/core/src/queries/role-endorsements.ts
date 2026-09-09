import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, ProfileRole } from "../types";

export type PromotionCandidate = Profile & {
  endorsementCount: number;
  endorsedByMe: boolean;
  endorserUsernames: string[];
};

/**
 * Active members eligible to be endorsed into leadership. `profiles` SELECT is
 * unscoped RLS-wise ("profiles are publicly readable"), so a leader's scoping to
 * their own vouched-in group has to happen in this query, not via RLS — unlike
 * posts/reports, which are scoped by the RLS policy itself.
 */
export async function listPromotionCandidates(
  client: SupabaseClient<Database>,
  viewerId: string,
  viewerRole: ProfileRole,
): Promise<PromotionCandidate[]> {
  let query = client.from("profiles").select("*").eq("status", "active").eq("role", "member");

  if (viewerRole === "leader") {
    const { data: vouched, error: vouchedError } = await client
      .from("vouch_requests")
      .select("guest_id")
      .eq("leader_id", viewerId)
      .eq("status", "vouched");
    if (vouchedError) throw vouchedError;

    const candidateIds = (vouched ?? []).map((v) => v.guest_id);
    if (candidateIds.length === 0) return [];
    query = query.in("id", candidateIds);
  }

  const { data: candidates, error } = await query;
  if (error) throw error;
  if (!candidates || candidates.length === 0) return [];

  const { data: endorsements, error: endorsementsError } = await client
    .from("role_endorsements")
    .select("candidate_id, endorser_id, endorser:profiles!role_endorsements_endorser_id_fkey(username)")
    .in(
      "candidate_id",
      candidates.map((c) => c.id),
    );
  if (endorsementsError) throw endorsementsError;

  const rows = (endorsements ?? []) as unknown as Array<{ candidate_id: string; endorser_id: string; endorser: { username: string } | null }>;
  const byCandidate = new Map<string, { endorser_id: string; username: string }[]>();
  for (const row of rows) {
    const list = byCandidate.get(row.candidate_id) ?? [];
    list.push({ endorser_id: row.endorser_id, username: row.endorser?.username ?? "unknown" });
    byCandidate.set(row.candidate_id, list);
  }

  return candidates.map((candidate) => {
    const candidateEndorsements = byCandidate.get(candidate.id) ?? [];
    return {
      ...candidate,
      endorsementCount: candidateEndorsements.length,
      endorsedByMe: candidateEndorsements.some((r) => r.endorser_id === viewerId),
      endorserUsernames: candidateEndorsements.map((r) => r.username),
    };
  });
}

/** A leader/admin endorses a candidate; promotion to leader happens server-side once 2 distinct endorsements exist. */
export async function endorseForLeader(client: SupabaseClient<Database>, candidateId: string) {
  const { error } = await client.rpc("endorse_for_leader", { p_candidate_id: candidateId });
  if (error) throw error;
}

/** Admin-only override: set a profile's role directly, bypassing endorsements. */
export async function setProfileRole(client: SupabaseClient<Database>, targetId: string, newRole: ProfileRole) {
  const { error } = await client.rpc("set_profile_role", { p_target_id: targetId, new_role: newRole });
  if (error) throw error;
}
