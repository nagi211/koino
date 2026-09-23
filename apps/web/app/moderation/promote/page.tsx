import { listPromotionCandidates } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/get-viewer-profile";
import { PromoteQueue } from "./promote-queue";

export default async function PromoteMembersPage() {
  const profile = await getViewerProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const candidates = await listPromotionCandidates(supabase, profile.id, profile.role);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Promote members</h1>
      <PromoteQueue candidates={candidates} isAdmin={profile.role === "admin"} />
    </>
  );
}
