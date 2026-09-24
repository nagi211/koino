import { redirect } from "next/navigation";
import { getMyProfile, listMyConversations } from "@koino/core";
import { createClient } from "@/lib/supabase/server";
import { MessagesInbox } from "./messages-inbox";

export default async function MessagesPage() {
  const supabase = await createClient();
  const profile = await getMyProfile(supabase);

  if (!profile) redirect("/");

  const conversations = await listMyConversations(supabase, profile.id);

  return <MessagesInbox conversations={conversations} viewerId={profile.id} />;
}
