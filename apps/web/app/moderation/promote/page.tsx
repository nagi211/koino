import { getMyProfile, listPromotionCandidates } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { PromoteQueue } from "./promote-queue";

export default async function PromoteMembersPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);
  if (!profile) return null;

  const candidates = await listPromotionCandidates(supabase, profile.id, profile.role);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Promote members</h1>
      <PromoteQueue candidates={candidates} isAdmin={profile.role === "admin"} />
    </>
  );
}
