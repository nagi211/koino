import { getMyProfile, listMyConversations } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { MessagesInbox } from "./messages-inbox";

export default async function MessagesPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  if (!profile) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">Sign in to view your messages.</p>
      </main>
    );
  }

  const conversations = await listMyConversations(supabase, profile.id);

  return <MessagesInbox conversations={conversations} viewerId={profile.id} />;
}
