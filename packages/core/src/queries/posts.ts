import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Post, PostWithAuthor, ProfileRole } from "../types";
import type { CreatePostInput, ReportInput } from "../schemas";

type RawPostRow = Post & {
  profiles: { username: string; avatar_url: string | null } | null;
  post_likes: Array<{ count: number }>;
  post_comments: Array<{ count: number }>;
};

function withAuthorUsername(rows: RawPostRow[]): PostWithAuthor[] {
  return rows.map(({ profiles, post_likes, post_comments, ...post }) => ({
    ...post,
    author_username: profiles?.username ?? "unknown",
    author_avatar_url: profiles?.avatar_url ?? null,
    like_count: post_likes[0]?.count ?? 0,
    comment_count: post_comments[0]?.count ?? 0,
  }));
}

// The FK hint (!posts_author_id_fkey) disambiguates from the many-to-many path to
// profiles that post_likes introduces — without it PostgREST can't tell which
// relationship `profiles(username)` should follow.
const FEED_SELECT = "*, profiles!posts_author_id_fkey(username, avatar_url), post_likes(count), post_comments(count)";

/**
 * The public feed — RLS already restricts this to status='approved' (or your own
 * posts). audience='public' is also filtered here explicitly, not just left to
 * RLS: a viewer who happens to be someone's confirmed family is *also* granted
 * visibility into that family's posts by a separate policy, and without this
 * filter their family content would bleed into the general public feed instead
 * of staying on the dedicated /family page.
 */
export async function getApprovedFeed(client: SupabaseClient<Database>): Promise<PostWithAuthor[]> {
  const { data, error } = await client
    .from("posts")
    .select(FEED_SELECT)
    .eq("status", "approved")
    .eq("audience", "public")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return withAuthorUsername(data as unknown as RawPostRow[]);
}

/** The family-only feed — RLS scopes this to the caller's own confirmed family circle. */
export async function getFamilyFeed(client: SupabaseClient<Database>): Promise<PostWithAuthor[]> {
  const { data, error } = await client
    .from("posts")
    .select(FEED_SELECT)
    .eq("audience", "family")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return withAuthorUsername(data as unknown as RawPostRow[]);
}

/** The friends-only feed — RLS scopes this to confirmed friends or confirmed family (see 0038). */
export async function getFriendsFeed(client: SupabaseClient<Database>): Promise<PostWithAuthor[]> {
  const { data, error } = await client
    .from("posts")
    .select(FEED_SELECT)
    .eq("audience", "friends")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return withAuthorUsername(data as unknown as RawPostRow[]);
}

// Posts are approved instantly now (see 0030_auto_approve_all_posts.sql) — this
// is a monitoring feed, not an approval queue. Unlike the old pending-only
// query, RLS alone doesn't scope this to the leader's group anymore: approved
// posts are independently publicly readable (0028_close_reporting_gaps.sql),
// so that policy branch is satisfied regardless of group membership. Scoping
// has to happen here in the query, same pattern as listPromotionCandidates.
const RECENT_POSTS_LIMIT = 50;

/** For the leader/admin monitoring feed. */
export async function getRecentPostsForModerator(
  client: SupabaseClient<Database>,
  viewerId: string,
  viewerRole: ProfileRole
): Promise<PostWithAuthor[]> {
  let query = client.from("posts").select(FEED_SELECT).eq("status", "approved").eq("audience", "public");

  if (viewerRole === "leader") {
    const { data: vouched, error: vouchedError } = await client
      .from("vouch_requests")
      .select("guest_id")
      .eq("leader_id", viewerId)
      .eq("status", "vouched");
    if (vouchedError) throw vouchedError;

    const authorIds = (vouched ?? []).map((v) => v.guest_id);
    if (authorIds.length === 0) return [];
    query = query.in("author_id", authorIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(RECENT_POSTS_LIMIT);
  if (error) throw error;

  return withAuthorUsername(data as unknown as RawPostRow[]);
}

/** For rendering a set of posts as real PostCards elsewhere (e.g. the reports queue) — RLS-scoped like everything else here. */
export async function getPostsByIds(client: SupabaseClient<Database>, ids: string[]): Promise<PostWithAuthor[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client.from("posts").select(FEED_SELECT).in("id", ids);
  if (error) throw error;

  return withAuthorUsername(data as unknown as RawPostRow[]);
}

/**
 * For the profile page's "Latest Post" panel — deliberately has no audience
 * filter, unlike getApprovedFeed/getFamilyFeed/getFriendsFeed. RLS alone
 * decides which of this author's posts the querying viewer can see (public to
 * anyone, family/friends only to a confirmed connection, everything to the
 * author themselves), so the most recent row Postgres actually returns here
 * is already the right one — a stranger gets the latest public post, a
 * confirmed friend or family member gets whichever is actually most recent
 * among public/family/friends, with no extra logic needed to replicate RLS.
 */
export async function getLatestVisiblePost(client: SupabaseClient<Database>, authorId: string): Promise<PostWithAuthor | null> {
  const { data, error } = await client
    .from("posts")
    .select(FEED_SELECT)
    .eq("status", "approved")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return withAuthorUsername([data as unknown as RawPostRow])[0];
}

const PROFILE_POSTS_LIMIT = 50;

/** For the profile page's "See all posts" page — same no-audience-filter,
 * RLS-decides-visibility reasoning as getLatestVisiblePost, just not limited
 * to one row. */
export async function getVisiblePostsByAuthor(client: SupabaseClient<Database>, authorId: string): Promise<PostWithAuthor[]> {
  const { data, error } = await client
    .from("posts")
    .select(FEED_SELECT)
    .eq("status", "approved")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(PROFILE_POSTS_LIMIT);
  if (error) throw error;

  return withAuthorUsername(data as unknown as RawPostRow[]);
}

/**
 * RLS enforces: public posts require status='active'; family and friends posts
 * only require not being suspended (guests can post to their own family circle
 * and friends — see 0032_family_circles.sql and 0038_friends_family_automatic.sql).
 */
export async function createPost(client: SupabaseClient<Database>, authorId: string, input: CreatePostInput): Promise<Post> {
  const { data, error } = await client
    .from("posts")
    .insert({
      author_id: authorId,
      type: input.type,
      body: input.body ?? null,
      media_url: input.media_url ?? null,
      background: input.background ?? null,
      text_size: input.text_size ?? null,
      audience: input.audience,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reportContent(client: SupabaseClient<Database>, reporterId: string, input: ReportInput) {
  const { error } = await client
    .from("reports")
    .insert({ reporter_id: reporterId, target_type: input.target_type, target_id: input.target_id, reason: input.reason });
  if (error) throw error;
}

/** Leader/admin moderation decision, via the set_post_status RPC (audit-logged server-side). */
export async function setPostStatus(
  client: SupabaseClient<Database>,
  postId: string,
  status: Post["status"],
  reason?: string
) {
  const { error } = await client.rpc("set_post_status", { post_id: postId, new_status: status, reason: reason ?? null });
  if (error) throw error;
}
