import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Story, StoryAudience, StoryWithAuthor } from "../types";

function withAuthorProfile(
  data: Array<Story & { profiles: { username: string; avatar_url: string | null } | null }>
): StoryWithAuthor[] {
  return data.map(({ profiles, ...story }) => ({
    ...story,
    author_username: profiles?.username ?? "unknown",
    author_avatar_url: profiles?.avatar_url ?? null,
  }));
}

/** RLS already restricts this to expires_at > now() and audience='family' (0048_story_audience.sql). */
export async function getFamilyStories(client: SupabaseClient<Database>): Promise<StoryWithAuthor[]> {
  const { data, error } = await client
    .from("stories")
    .select("*, profiles!stories_author_id_fkey(username, avatar_url)")
    .eq("audience", "family")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return withAuthorProfile(data as unknown as Array<Story & { profiles: { username: string; avatar_url: string | null } | null }>);
}

/** RLS already restricts this to expires_at > now() and audience='friends' (0048_story_audience.sql). */
export async function getFriendsStories(client: SupabaseClient<Database>): Promise<StoryWithAuthor[]> {
  const { data, error } = await client
    .from("stories")
    .select("*, profiles!stories_author_id_fkey(username, avatar_url)")
    .eq("audience", "friends")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return withAuthorProfile(data as unknown as Array<Story & { profiles: { username: string; avatar_url: string | null } | null }>);
}

/** RLS enforces author must have status='active' and audience in ('family','friends'). */
export async function createStory(
  client: SupabaseClient<Database>,
  authorId: string,
  mediaUrl: string,
  audience: StoryAudience
): Promise<Story> {
  const { data, error } = await client
    .from("stories")
    .insert({ author_id: authorId, media_url: mediaUrl, audience })
    .select()
    .single();
  if (error) throw error;
  return data;
}
