"use client";

import { useState } from "react";
import { likeProfile, unlikeProfile } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

export function ProfileLikeButton({
  viewer,
  profileId,
  initiallyLiked,
  onToggle,
  requireAuth,
}: {
  viewer: Profile | null;
  profileId: string;
  initiallyLiked: boolean;
  onToggle: (liked: boolean) => void;
  requireAuth: (action: () => void) => void;
}) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleLike() {
    if (!viewer) return;
    const next = !liked;
    setLiked(next);
    onToggle(next);
    setPending(true);
    setError(null);
    try {
      if (next) {
        await likeProfile(createClient(), profileId, viewer.id);
      } else {
        await unlikeProfile(createClient(), profileId, viewer.id);
      }
    } catch (err) {
      setLiked(!next);
      onToggle(!next);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => requireAuth(toggleLike)}
        className={`rounded-full border px-4 py-1.5 text-sm disabled:opacity-50 ${
          liked ? "border-transparent bg-olive-dark text-white" : "border-card-border text-muted hover:text-foreground"
        }`}
      >
        {liked ? "♥ Liked" : "♡ Like this profile"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}