import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileComment, ProfileCommentWithAuthor } from "../types";
import type { ProfileCommentInput } from "../schemas";

export async function getProfileComments(
  client: SupabaseClient<Database>,
  profileId: string
): Promise<ProfileCommentWithAuthor[]> {
  const { data, error } = await client
    .from("profile_comments")
    .select("*, profiles!profile_comments_author_id_fkey(username, avatar_url)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    data as unknown as Array<ProfileComment & { profiles: { username: string; avatar_url: string | null } | null }>
  ).map(({ profiles, ...comment }) => ({
    ...comment,
    author_username: profiles?.username ?? "unknown",
    author_avatar_url: profiles?.avatar_url ?? null,
  }));
}

/** For rendering a set of wall comments elsewhere (e.g. the reports queue) — RLS-scoped like everything else here. */
export async function getProfileCommentsByIds(client: SupabaseClient<Database>, ids: string[]): Promise<ProfileCommentWithAuthor[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from("profile_comments")
    .select("*, profiles!profile_comments_author_id_fkey(username, avatar_url)")
    .in("id", ids);
  if (error) throw error;

  return (
    data as unknown as Array<ProfileComment & { profiles: { username: string; avatar_url: string | null } | null }>
  ).map(({ profiles, ...comment }) => ({
    ...comment,
    author_username: profiles?.username ?? "unknown",
    author_avatar_url: profiles?.avatar_url ?? null,
  }));
}

/** RLS enforces status='active' for the author. */
export async function addProfileComment(
  client: SupabaseClient<Database>,
  authorId: string,
  input: ProfileCommentInput
): Promise<ProfileComment> {
  const { data, error } = await client
    .from("profile_comments")
    .insert({ profile_id: input.profile_id, author_id: authorId, body: input.body })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** RLS restricts this to the wall owner or the comment's author. */
export async function deleteProfileComment(client: SupabaseClient<Database>, commentId: string) {
  const { error } = await client.from("profile_comments").delete().eq("id", commentId);
  if (error) throw error;
}
