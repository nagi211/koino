"use client";

import { useEffect, useRef, useState } from "react";
import { listMessages, sendMessage, subscribeToMessages } from "@koino/core";
import type { Message } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { ReportModal } from "./report-modal";

/**
 * Generic message thread — used for both sides of the guest/leader vouching
 * chat. Deliberately doesn't know who the "other party" is (no name/avatar
 * lookups); the caller's own surrounding UI supplies that context.
 */
export function ConversationView({ conversationId, viewerId }: { conversationId: string; viewerId: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Message | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    const client = createClient();
    listMessages(client, conversationId).then((data) => {
      if (!cancelled) setMessages(data);
    });
    const unsubscribe = subscribeToMessages(client, conversationId, (message) => {
      setMessages((prev) => (prev ? [...prev, message] : [message]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(createClient(), viewerId, { conversation_id: conversationId, body: trimmed });
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-card-border">
      <ul ref={listRef} className="flex flex-1 flex-col justify-end gap-2 overflow-y-auto p-3">
        {messages === null && <li className="text-sm text-muted">Loading…</li>}
        {messages?.length === 0 && <li className="text-sm text-muted">Say hello to get started.</li>}
        {messages?.map((message) => {
          const mine = message.sender_id === viewerId;
          return (
            <li key={message.id} className={`group flex items-center gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              <span
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-olive-dark text-white" : "bg-input text-foreground"
                }`}
              >
                {message.body}
              </span>
              {!mine && (
                <button
                  type="button"
                  onClick={() => setReportTarget(message)}
                  className="shrink-0 text-xs text-muted opacity-0 hover:text-foreground group-hover:opacity-100"
                >
                  Report
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form onSubmit={handleSend} className="flex gap-2 border-t border-card-border p-3">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-xl border border-card-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-xl bg-olive-dark px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {error && <p className="px-3 pb-2 text-xs text-danger">{error}</p>}

      {reportTarget && (
        <ReportModal
          key={reportTarget.id}
          open
          onClose={() => setReportTarget(null)}
          reporterId={viewerId}
          targetType="message"
          targetId={reportTarget.id}
        />
      )}
    </div>
  );
}
