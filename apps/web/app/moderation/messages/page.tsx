import { getMyProfile, listVouchRequestsForLeader } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { VouchQueue } from "../vouch-queue";

export default async function ModerationMessagesPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);
  if (!profile) return null;

  const vouchRequests = await listVouchRequestsForLeader(supabase, profile.id);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">Message requests</h1>
      <VouchQueue requests={vouchRequests} leaderId={profile.id} />
    </>
  );
}
