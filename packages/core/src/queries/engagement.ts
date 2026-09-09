import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PostComment, PostCommentWithAuthor } from "../types";
import type { CommentInput } from "../schemas";

async function getMyPostIds(
  client: SupabaseClient<Database>,
  table: "post_likes" | "saved_posts",
  profileId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();

  const { data, error } = await client.from(table).select("post_id").eq("profile_id", profileId).in("post_id", postIds);
  if (error) throw error;

  return new Set(data.map((row) => row.post_id));
}

/** Which of the given post ids this profile has liked — for rendering filled/outline hearts. */
export function getMyLikedPostIds(client: SupabaseClient<Database>, profileId: string, postIds: string[]) {
  return getMyPostIds(client, "post_likes", profileId, postIds);
}

/** RLS enforces status='active' and the post being approved. */
export async function likePost(client: SupabaseClient<Database>, postId: string, profileId: string) {
  const { error } = await client.from("post_likes").insert({ post_id: postId, profile_id: profileId });
  if (error) throw error;
}

export async function unlikePost(client: SupabaseClient<Database>, postId: string, profileId: string) {
  const { error } = await client.from("post_likes").delete().eq("post_id", postId).eq("profile_id", profileId);
  if (error) throw error;
}

/** Which of the given post ids this profile has saved — for the post menu's Save/Unsave label. */
export function getMySavedPostIds(client: SupabaseClient<Database>, profileId: string, postIds: string[]) {
  return getMyPostIds(client, "saved_posts", profileId, postIds);
}

/** RLS only requires being signed in and the post being approved — no 'active' gate. */
export async function savePost(client: SupabaseClient<Database>, postId: string, profileId: string) {
  const { error } = await client.from("saved_posts").insert({ post_id: postId, profile_id: profileId });
  if (error) throw error;
}

export async function unsavePost(client: SupabaseClient<Database>, postId: string, profileId: string) {
  const { error } = await client.from("saved_posts").delete().eq("post_id", postId).eq("profile_id", profileId);
  if (error) throw error;
}

export async function getComments(client: SupabaseClient<Database>, postId: string): Promise<PostCommentWithAuthor[]> {
  const { data, error } = await client
    .from("post_comments")
    .select("*, profiles(username, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (
    data as unknown as Array<PostComment & { profiles: { username: string; avatar_url: string | null } | null }>
  ).map(({ profiles, ...comment }) => ({
    ...comment,
    author_username: profiles?.username ?? "unknown",
    author_avatar_url: profiles?.avatar_url ?? null,
  }));
}

/** RLS enforces status='active' and the post being approved. */
export async function addComment(
  client: SupabaseClient<Database>,
  authorId: string,
  input: CommentInput
): Promise<PostComment> {
  const { data, error } = await client
    .from("post_comments")
    .insert({ author_id: authorId, post_id: input.post_id, body: input.body })
    .select()
    .single();
  if (error) throw error;
  return data;
}
