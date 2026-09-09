import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, ProfileViewWithProfile } from "../types";

/**
 * Counts likes + views in one round trip for the profile header. `viewerCount` is
 * distinct people; `totalViewCount` counts every recorded visit (the same person
 * can add one more per day — see recordProfileView) so the two numbers can differ.
 * PostgREST has no "count distinct", so viewerCount is derived from the actual
 * viewer_id rows rather than a head-only count — fine at this app's scale.
 */
export async function getProfileStats(
  client: SupabaseClient<Database>,
  profileId: string
): Promise<{ likeCount: number; viewerCount: number; totalViewCount: number }> {
  const [likes, totalViews, viewerRows] = await Promise.all([
    client.from("profile_likes").select("*", { count: "exact", head: true }).eq("profile_id", profileId),
    client.from("profile_views").select("*", { count: "exact", head: true }).eq("profile_id", profileId),
    client.from("profile_views").select("viewer_id").eq("profile_id", profileId),
  ]);
  if (likes.error) throw likes.error;
  if (totalViews.error) throw totalViews.error;
  if (viewerRows.error) throw viewerRows.error;
  const viewerCount = new Set((viewerRows.data ?? []).map((row) => row.viewer_id)).size;
  return { likeCount: likes.count ?? 0, viewerCount, totalViewCount: totalViews.count ?? 0 };
}

/**
 * Records a view. RLS + a DB check both reject viewerId === profileId, so callers
 * should simply skip calling this for self-views rather than relying on the
 * rejection — call only when a signed-in, non-owner viewer loads the page.
 * `onConflict` targets (profile_id, viewer_id, viewed_date) — the same viewer
 * generates a new row once per calendar day (viewed_date defaults to
 * current_date), not just once ever.
 */
export async function recordProfileView(client: SupabaseClient<Database>, profileId: string, viewerId: string) {
  const { error } = await client
    .from("profile_views")
    .upsert({ profile_id: profileId, viewer_id: viewerId }, { onConflict: "profile_id,viewer_id,viewed_date", ignoreDuplicates: true });
  if (error) throw error;
}

/** Distinct viewers, most recently-viewed first — for the owner-only "who viewed me" list. */
export async function getProfileViewers(
  client: SupabaseClient<Database>,
  profileId: string,
  limit = 50
): Promise<ProfileViewWithProfile[]> {
  // Over-fetch raw (possibly-repeated-per-day) rows, then de-dupe by viewer client
  // side, keeping each viewer's most recent visit — same reasoning as viewerCount
  // above, no "distinct on" available via PostgREST.
  const { data, error } = await client
    .from("profile_views")
    .select("viewer_id, viewed_at, viewer:profiles!profile_views_viewer_id_fkey(*)")
    .eq("profile_id", profileId)
    .order("viewed_at", { ascending: false })
    .limit(limit * 5);
  if (error) throw error;

  const rows = data as unknown as Array<{ viewer_id: string; viewed_at: string; viewer: Profile }>;
  const seen = new Set<string>();
  const result: ProfileViewWithProfile[] = [];
  for (const row of rows) {
    if (seen.has(row.viewer_id)) continue;
    seen.add(row.viewer_id);
    result.push({ viewer_id: row.viewer_id, viewed_at: row.viewed_at, profile: row.viewer });
    if (result.length >= limit) break;
  }
  return result;
}