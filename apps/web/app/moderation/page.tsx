import { getRecentPostsForModerator } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/get-viewer-profile";
import { RecentPosts } from "./recent-posts";

export default async function ModerationPage() {
  const profile = await getViewerProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const recent = await getRecentPostsForModerator(supabase, profile.id, profile.role);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Recent posts</h1>
      <RecentPosts posts={recent} />
    </>
  );
}
