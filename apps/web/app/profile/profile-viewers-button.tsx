"use client";

import { useState } from "react";
import Link from "next/link";
import { getProfileViewers } from "@koino/core";
import type { ProfileViewWithProfile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";
import { Modal } from "../modal";

/** Owner-only "who viewed me" list, opened by clicking the viewer count. */
export function ProfileViewersButton({ profileId, viewerCount }: { profileId: string; viewerCount: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState<ProfileViewWithProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (viewers || loading) return;
    setLoading(true);
    setError(null);
    try {
      setViewers(await getProfileViewers(createClient(), profileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className="underline decoration-dotted underline-offset-2 hover:opacity-80">
        {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} widthClassName="max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Viewers</h2>
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {viewers && viewers.length === 0 && <p className="text-sm text-muted">No views yet.</p>}
        {viewers && viewers.length > 0 && (
          <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto">
            {viewers.map((v) => (
              <li key={v.viewer_id}>
                <Link
                  href={`/profile/${v.profile.username}`}
                  className="flex items-center gap-3 hover:opacity-80"
                  onClick={() => setOpen(false)}
                >
                  <Avatar url={v.profile.avatar_url} username={v.profile.username} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">@{v.profile.username}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
