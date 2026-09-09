import { getMyProfile, getRecentPostsForModerator } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { RecentPosts } from "./recent-posts";

export default async function ModerationPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);
  if (!profile) return null;

  const recent = await getRecentPostsForModerator(supabase, profile.id, profile.role);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Recent posts</h1>
      <RecentPosts posts={recent} />
    </>
  );
}
