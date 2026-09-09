import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PostWithAuthor, ProfileCommentWithAuthor, Report } from "../types";
import { getPostsByIds } from "./posts";
import { getProfileCommentsByIds } from "./profile-comments";

export type ReportWithContext = Report & {
  reporter_username: string;
  reporter_avatar_url: string | null;
  // The reported content itself, in its normal shape — rendered as a real
  // PostCard/wall-comment row in the moderation UI rather than a stripped-down
  // summary, so a leader/admin reviews it exactly as it actually looks. Exactly
  // one of these is set, matching target_type.
  post: PostWithAuthor | null;
  comment: ProfileCommentWithAuthor | null;
  // Message reports get neither of the above — message content stays private
  // (RLS is member-only, on purpose). This resolves who sent it, via a
  // SECURITY DEFINER RPC that reveals identity but not content, so there's at
  // least someone to click through to and act on. Admin-only (leaders never
  // see message-type reports at all, per 0023_moderation_groups.sql), and null
  // for non-message reports or if resolution fails for any reason.
  message_sender: { id: string; username: string; avatar_url: string | null } | null;
};

/**
 * Open reports a leader/admin can act on — RLS narrows this per caller exactly
 * like getRecentPostsForModerator (admins see everything, leaders only reports
 * about their own vouchees' content). The report row itself is fetched first, so by
 * the time we resolve its target content below, RLS has already confirmed the
 * caller is allowed to see it.
 */
export async function getReportsForModerator(client: SupabaseClient<Database>): Promise<ReportWithContext[]> {
  const { data, error } = await client
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(username, avatar_url)")
    .eq("resolved", false)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data as unknown as Array<Report & { reporter: { username: string; avatar_url: string | null } | null }>;
  const postIds = rows.filter((r) => r.target_type === "post").map((r) => r.target_id);
  const commentIds = rows.filter((r) => r.target_type === "profile_comment").map((r) => r.target_id);
  const messageReports = rows.filter((r) => r.target_type === "message");

  const [postRows, commentRows, messageSenders] = await Promise.all([
    getPostsByIds(client, postIds),
    getProfileCommentsByIds(client, commentIds),
    Promise.all(
      messageReports.map(async (r) => {
        const { data } = await client.rpc("resolve_message_report_sender", { p_report_id: r.id });
        const sender = data?.[0];
        return [r.id, sender ? { id: sender.sender_id, username: sender.username, avatar_url: sender.avatar_url } : null] as const;
      })
    ),
  ]);
  const posts = new Map(postRows.map((p) => [p.id, p]));
  const comments = new Map(commentRows.map((c) => [c.id, c]));
  const senders = new Map(messageSenders);

  return rows.map(({ reporter, ...report }) => ({
    ...report,
    reporter_username: reporter?.username ?? "unknown",
    reporter_avatar_url: reporter?.avatar_url ?? null,
    post: report.target_type === "post" ? (posts.get(report.target_id) ?? null) : null,
    comment: report.target_type === "profile_comment" ? (comments.get(report.target_id) ?? null) : null,
    message_sender: report.target_type === "message" ? (senders.get(report.id) ?? null) : null,
  }));
}

/** Marks a report resolved (dismissed, or handled some other way) — RLS-scoped, no RPC needed. */
export async function resolveReport(client: SupabaseClient<Database>, reportId: string) {
  const { error } = await client.from("reports").update({ resolved: true }).eq("id", reportId);
  if (error) throw error;
}
