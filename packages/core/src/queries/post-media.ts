import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PostMedia } from "../types";

/** Batched, same shape as getPostTagsForPosts — one round trip for a whole feed's worth of posts. */
export async function getPostMediaForPosts(
  client: SupabaseClient<Database>,
  postIds: string[]
): Promise<Record<string, PostMedia[]>> {
  if (postIds.length === 0) return {};

  const { data, error } = await client
    .from("post_media")
    .select("*")
    .in("post_id", postIds)
    .order("position", { ascending: true });
  if (error) throw error;

  const byPost: Record<string, PostMedia[]> = {};
  for (const row of data as PostMedia[]) {
    if (!byPost[row.post_id]) byPost[row.post_id] = [];
    byPost[row.post_id].push(row);
  }
  return byPost;
}

/** RLS restricts this to the post's own author (see 0049_post_media.sql). */
export async function addPostMedia(client: SupabaseClient<Database>, postId: string, mediaUrls: string[]) {
  if (mediaUrls.length === 0) return;
  const { error } = await client
    .from("post_media")
    .insert(mediaUrls.map((media_url, position) => ({ post_id: postId, media_url, position })));
  if (error) throw error;
}
