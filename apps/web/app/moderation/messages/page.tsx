import { listVouchRequestsForLeader } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { getViewerProfile } from "@/lib/get-viewer-profile";
import { VouchQueue } from "../vouch-queue";

export default async function ModerationMessagesPage() {
  const profile = await getViewerProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const vouchRequests = await listVouchRequestsForLeader(supabase, profile.id);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Message requests</h1>
      <VouchQueue requests={vouchRequests} leaderId={profile.id} />
    </>
  );
}
