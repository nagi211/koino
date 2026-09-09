import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conversation, ConversationType, Database, Message } from "../types";
import type { SendMessageInput } from "../schemas";

/**
 * Creates a conversation and adds the creator as the first member. Note: adding a
 * second member (e.g. the guest into a leader_chat, or invitees into a group_room)
 * is a separate conversation_members insert, gated by the "join rules by conversation
 * type and status" RLS policy (guests can only ever join leader_chat conversations).
 */
export async function createConversation(
  client: SupabaseClient,
  createdBy: string,
  type: ConversationType
): Promise<Conversation> {
  const { data, error } = await client
    .from("conversations")
    .insert({ created_by: createdBy, type })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function joinConversation(client: SupabaseClient, conversationId: string, profileId: string) {
  const { error } = await client
    .from("conversation_members")
    .insert({ conversation_id: conversationId, profile_id: profileId });
  if (error) throw error;
}

export async function listMessages(client: SupabaseClient, conversationId: string): Promise<Message[]> {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendMessage(client: SupabaseClient, senderId: string, input: SendMessageInput) {
  const { error } = await client
    .from("messages")
    .insert({ conversation_id: input.conversation_id, sender_id: senderId, body: input.body });
  if (error) throw error;
}

/**
 * Starts (or reuses) a DM with a friend — RLS-gated via a SECURITY DEFINER RPC
 * rather than the raw createConversation/joinConversation pair, since a DM
 * needs both members added atomically and the caller can't add the other
 * party's membership row directly (RLS only lets you insert your own).
 */
export async function startDmConversation(client: SupabaseClient, otherId: string): Promise<string> {
  const { data, error } = await client.rpc("start_dm_conversation", { other_id: otherId });
  if (error) throw error;
  return data as string;
}

export function subscribeToMessages(
  client: SupabaseClient,
  conversationId: string,
  onMessage: (message: Message) => void
) {
  const channel = client
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as Message)
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
