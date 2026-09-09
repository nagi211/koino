"use client";

import { useState } from "react";
import Image from "next/image";
import type { Profile, StoryWithAuthor } from "@koino/core";
import { Avatar } from "./avatar";
import { StoryComposer } from "./story-composer";

export function StoriesRow({
  stories,
  profile,
  requireAuth,
}: {
  stories: StoryWithAuthor[];
  profile: Profile | null;
  requireAuth: (action: () => void) => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewing, setViewing] = useState<StoryWithAuthor | null>(null);

  // One bubble per author — stories arrive newest-first, so the first hit per author is their latest.
  const byAuthor = new Map<string, StoryWithAuthor>();
  for (const story of stories) {
    if (!byAuthor.has(story.author_id)) byAuthor.set(story.author_id, story);
  }
  const bubbles = Array.from(byAuthor.values());

  return (
    <div className="flex shrink-0 gap-3 overflow-x-auto pb-4">
      <button
        type="button"
        onClick={() => requireAuth(() => setComposerOpen(true))}
        className="flex w-20 shrink-0 flex-col items-center gap-1"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-card-border text-2xl leading-none text-muted">
          +
        </span>
        <span className="text-xs text-muted">Add story</span>
      </button>

      {bubbles.map((story) => (
        <button
          key={story.author_id}
          type="button"
          onClick={() => setViewing(story)}
          className="flex w-20 shrink-0 flex-col items-center gap-1"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-olive to-olive-dark p-0.5">
            <Avatar url={story.author_avatar_url} username={story.author_username} size={60} />
          </span>
          <span className="w-full truncate text-center text-xs text-muted">@{story.author_username}</span>
        </button>
      ))}

      {profile && <StoryComposer open={composerOpen} onClose={() => setComposerOpen(false)} authorId={profile.id} />}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Close"
            className="absolute right-6 top-6 text-2xl text-white"
          >
            ✕
          </button>
          <div className="relative h-[80vh] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <Image src={viewing.media_url} alt="" fill className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
