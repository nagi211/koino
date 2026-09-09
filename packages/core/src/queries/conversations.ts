import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationType, Database } from "../types";

export type ConversationSummary = {
  id: string;
  type: ConversationType;
  otherParty: { username: string; avatar_url: string | null } | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
};

/**
 * Every conversation the caller is actually a member of — RLS scopes each of
 * the three queries below to that automatically. Same fetch-then-assemble
 * shape as getReportsForModerator: fetch my membership rows first, then batch
 * the other member + latest message per conversation, then merge in JS.
 */
export async function listMyConversations(client: SupabaseClient<Database>, profileId: string): Promise<ConversationSummary[]> {
  const { data: memberRows, error: memberError } = await client
    .from("conversation_members")
    .select("conversation_id, conversations(id, type, created_at)")
    .eq("profile_id", profileId);
  if (memberError) throw memberError;

  type MyRow = { conversation_id: string; conversations: { id: string; type: ConversationType; created_at: string } | null };
  const mine = (memberRows as unknown as MyRow[]).filter((r) => r.conversations !== null);
  const conversationIds = mine.map((r) => r.conversation_id);
  if (conversationIds.length === 0) return [];

  const [otherMembersRes, messagesRes] = await Promise.all([
    client
      .from("conversation_members")
      .select("conversation_id, profiles(username, avatar_url)")
      .in("conversation_id", conversationIds)
      .neq("profile_id", profileId),
    client
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);
  if (otherMembersRes.error) throw otherMembersRes.error;
  if (messagesRes.error) throw messagesRes.error;

  type OtherRow = { conversation_id: string; profiles: { username: string; avatar_url: string | null } | null };
  const otherParties = new Map((otherMembersRes.data as unknown as OtherRow[]).map((r) => [r.conversation_id, r.profiles]));

  type MessageRow = { conversation_id: string; body: string; created_at: string };
  const lastMessages = new Map<string, MessageRow>();
  for (const row of messagesRes.data as unknown as MessageRow[]) {
    if (!lastMessages.has(row.conversation_id)) lastMessages.set(row.conversation_id, row); // already ordered desc — first seen wins
  }

  return mine
    .map((row) => {
      const conversation = row.conversations!;
      const lastMessage = lastMessages.get(conversation.id) ?? null;
      return {
        id: conversation.id,
        type: conversation.type,
        otherParty: otherParties.get(conversation.id) ?? null,
        lastMessageBody: lastMessage?.body ?? null,
        lastMessageAt: lastMessage?.created_at ?? null,
      };
    })
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}
