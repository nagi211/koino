import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PostTagWithProfile, Profile } from "../types";

/** Batched, same shape as getMyLikedPostIds — one round trip for a whole feed's worth of posts. */
export async function getPostTagsForPosts(
  client: SupabaseClient<Database>,
  postIds: string[]
): Promise<Record<string, PostTagWithProfile[]>> {
  if (postIds.length === 0) return {};

  const { data, error } = await client
    .from("post_tags")
    .select("id, post_id, profiles!post_tags_tagged_profile_id_fkey(*)")
    .in("post_id", postIds);
  if (error) throw error;

  const byPost: Record<string, PostTagWithProfile[]> = {};
  for (const row of data as unknown as Array<{ id: string; post_id: string; profiles: Profile | null }>) {
    if (!row.profiles) continue;
    if (!byPost[row.post_id]) byPost[row.post_id] = [];
    byPost[row.post_id].push({ tag_id: row.id, profile: row.profiles });
  }
  return byPost;
}

/** RLS restricts this to the post's own author tagging someone they're confirmed friends or family with (see 0047_post_tags.sql). */
export async function tagProfilesOnPost(client: SupabaseClient<Database>, postId: string, taggedProfileIds: string[]) {
  if (taggedProfileIds.length === 0) return;
  const { error } = await client.from("post_tags").insert(taggedProfileIds.map((tagged_profile_id) => ({ post_id: postId, tagged_profile_id })));
  if (error) throw error;
}

/** RLS restricts this to the post's own author or the tagged person themselves. */
export async function removePostTag(client: SupabaseClient<Database>, tagId: string) {
  const { error } = await client.from("post_tags").delete().eq("id", tagId);
  if (error) throw error;
}
