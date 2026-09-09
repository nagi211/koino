"use client";

import { useState } from "react";
import { savePost, sendFriendRequest, unsavePost } from "@koino/core";
import type { FriendshipStatus, Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 21V4" strokeLinecap="round" />
      <path d="M5 4h13l-2.5 4L18 12H5" strokeLinejoin="round" />
    </svg>
  );
}

function PersonAddIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" strokeLinecap="round" />
      <path d="M18 8v4M16 10h4" strokeLinecap="round" />
    </svg>
  );
}

export function PostMenu({
  postId,
  authorId,
  profile,
  initiallySaved,
  initialFriendStatus,
  requireAuth,
  onReport,
  lightText,
}: {
  postId: string;
  authorId: string;
  profile: Profile | null;
  initiallySaved: boolean;
  initialFriendStatus: FriendshipStatus;
  requireAuth: (action: () => void) => void;
  onReport: () => void;
  lightText: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(initiallySaved);
  const [prevInitiallySaved, setPrevInitiallySaved] = useState(initiallySaved);
  const [friendStatus, setFriendStatus] = useState(initialFriendStatus);
  const [prevInitialFriendStatus, setPrevInitialFriendStatus] = useState(initialFriendStatus);
  const [pending, setPending] = useState(false);

  if (initiallySaved !== prevInitiallySaved) {
    setPrevInitiallySaved(initiallySaved);
    setSaved(initiallySaved);
  }
  if (initialFriendStatus !== prevInitialFriendStatus) {
    setPrevInitialFriendStatus(initialFriendStatus);
    setFriendStatus(initialFriendStatus);
  }

  async function toggleSave() {
    if (!profile) return;
    const client = createClient();
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      if (next) {
        await savePost(client, postId, profile.id);
      } else {
        await unsavePost(client, postId, profile.id);
      }
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  async function addFriend() {
    if (!profile) return;
    setFriendStatus("pending_sent");
    try {
      await sendFriendRequest(createClient(), profile.id, authorId);
    } catch {
      setFriendStatus("none");
    }
  }

  const iconClass = lightText ? "text-white/80 hover:text-white" : "text-muted hover:text-foreground";
  const isOwnPost = profile?.id === authorId;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Post options"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none ${iconClass}`}
      >
        ⋯
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-card-border bg-card shadow-lg">
            {!isOwnPost && friendStatus !== "friends" && friendStatus !== "pending_received" && (
              <button
                type="button"
                disabled={friendStatus === "pending_sent"}
                onClick={() => {
                  setOpen(false);
                  requireAuth(addFriend);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-input disabled:opacity-50"
              >
                <PersonAddIcon />
                {friendStatus === "pending_sent" ? "Request sent" : "Add friend"}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                requireAuth(toggleSave);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-input disabled:opacity-50"
            >
              <BookmarkIcon filled={saved} />
              {saved ? "Unsave post" : "Save post"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReport();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-input"
            >
              <FlagIcon />
              Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}
