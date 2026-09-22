"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ConversationSummary } from "@koino/core";
import { Avatar } from "../avatar";
import { ConversationView } from "../conversation-view";
import { useMediaQuery } from "../use-media-query";

const TYPE_LABEL: Record<ConversationSummary["type"], string> = {
  dm: "Direct message",
  leader_chat: "Vouching chat",
  group_room: "Group room",
};

export function MessagesInbox({ conversations, viewerId }: { conversations: ConversationSummary[]; viewerId: string }) {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("c");
  // A specific ?c= link (e.g. from a notification) always opens straight to
  // that conversation, on any screen size — that's a deliberate navigation,
  // not the "just landed here" case. Absent that, mobile starts on the list
  // (matching the "tap to open" pattern the Back button already implies);
  // desktop keeps its existing auto-open-the-first-conversation behavior,
  // applied after mount once we actually know the viewport is desktop-sized.
  const [selectedId, setSelectedId] = useState<string | null>(
    fromQuery && conversations.some((c) => c.id === fromQuery) ? fromQuery : null
  );
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const autoSelected = useRef(false);
  useEffect(() => {
    if (autoSelected.current || !isDesktop || conversations.length === 0) return;
    autoSelected.current = true;
    setSelectedId((current) => current ?? conversations[0].id);
  }, [isDesktop, conversations]);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 flex">
      <div
        className={`flex w-full shrink-0 flex-col border-r border-card-border bg-background md:flex md:w-80 ${selectedId ? "hidden" : "flex"}`}
      >
        <div className="border-b border-card-border p-4">
          <Link href="/" className="text-xl font-bold text-foreground hover:opacity-80">
            Koino
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-6 text-sm text-muted">No conversations yet.</p>
          ) : (
            <ul className="flex flex-col">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`flex w-full items-center gap-3 border-b border-l-2 border-card-border p-4 text-left transition ${
                      selectedId === conversation.id ? "border-l-olive bg-olive/10" : "border-l-transparent hover:bg-input/50"
                    }`}
                  >
                    <Avatar
                      url={conversation.otherParty?.avatar_url ?? null}
                      username={conversation.otherParty?.username ?? "?"}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {conversation.otherParty ? `@${conversation.otherParty.username}` : TYPE_LABEL[conversation.type]}
                      </p>
                      <p className="truncate text-xs text-muted">{conversation.lastMessageBody ?? "No messages yet"}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`flex min-h-0 flex-1 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b border-card-border p-4">
              <button type="button" onClick={() => setSelectedId(null)} className="text-muted hover:text-foreground md:hidden">
                ← Back
              </button>
              <p className="font-medium text-foreground">
                {selected.otherParty ? `@${selected.otherParty.username}` : TYPE_LABEL[selected.type]}
              </p>
            </div>
            <div className="min-h-0 flex-1 p-4">
              <ConversationView conversationId={selected.id} viewerId={viewerId} />
            </div>
          </>
        ) : (
          <p className="p-6 text-center text-sm text-muted">Select a conversation</p>
        )}
      </div>
    </div>
  );
}
