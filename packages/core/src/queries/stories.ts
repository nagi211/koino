import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Story, StoryWithAuthor } from "../types";

/** RLS already restricts this to expires_at > now(). */
export async function getActiveStories(client: SupabaseClient<Database>): Promise<StoryWithAuthor[]> {
  const { data, error } = await client
    .from("stories")
    .select("*, profiles!stories_author_id_fkey(username, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data as unknown as Array<Story & { profiles: { username: string; avatar_url: string | null } | null }>).map(
    ({ profiles, ...story }) => ({
      ...story,
      author_username: profiles?.username ?? "unknown",
      author_avatar_url: profiles?.avatar_url ?? null,
    })
  );
}

/** RLS enforces author must have status='active'. */
export async function createStory(client: SupabaseClient<Database>, authorId: string, mediaUrl: string): Promise<Story> {
  const { data, error } = await client
    .from("stories")
    .insert({ author_id: authorId, media_url: mediaUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}
