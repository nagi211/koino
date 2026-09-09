import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

export async function hasLikedProfile(
  client: SupabaseClient<Database>,
  profileId: string,
  viewerId: string
): Promise<boolean> {
  const { data, error } = await client
    .from("profile_likes")
    .select("profile_id")
    .eq("profile_id", profileId)
    .eq("liker_id", viewerId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** RLS enforces status='active' for the liker, and no self-likes. */
export async function likeProfile(client: SupabaseClient<Database>, profileId: string, likerId: string) {
  const { error } = await client.from("profile_likes").insert({ profile_id: profileId, liker_id: likerId });
  if (error) throw error;
}

export async function unlikeProfile(client: SupabaseClient<Database>, profileId: string, likerId: string) {
  const { error } = await client.from("profile_likes").delete().eq("profile_id", profileId).eq("liker_id", likerId);
  if (error) throw error;
}