"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setTopFriends, updateProfile, updateProfileSchema } from "@koino/core";
import type { FriendshipWithProfile, Profile, ProfileTheme, TopFriendWithProfile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";
import { PanelStyleEditor } from "./panel-style-editor";
import { resolvePanelStyle, resolveTheme, withUpdatedPanelStyle } from "./theme";

const MAX_TOP_FRIENDS = 8;

export function FriendSpaceEditForm({
  profile,
  topFriends,
  myFriends,
  onSaved,
  onDirtyChange,
}: {
  profile: Profile;
  topFriends: TopFriendWithProfile[];
  myFriends: FriendshipWithProfile[];
  onSaved?: () => void;
  /** Reports whether the form has unsaved changes, so the surrounding modal can
   * confirm before discarding them on close. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ProfileTheme>(resolveTheme(profile.theme));
  const [selected, setSelected] = useState<string[]>(topFriends.map((tf) => tf.friend_id));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resettingPanel, setResettingPanel] = useState(false);
  // Tracks the last-saved value (not just the initial one) so a successful save
  // or instant reset can move the baseline forward — otherwise isDirty would
  // stay stuck true after those, incorrectly prompting to discard changes that
  // are already saved.
  const [savedState, setSavedState] = useState({ theme, selected });
  const isDirty = JSON.stringify({ theme, selected }) !== JSON.stringify(savedState);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const panelStyle = resolvePanelStyle(theme, "friendSpace");

  async function handleResetPanelStyleNow() {
    if (!window.confirm("Reset this panel's background, border, and colors back to default?")) return;
    setResettingPanel(true);
    try {
      const resetTheme = withUpdatedPanelStyle(theme, "friendSpace", null);
      setTheme(resetTheme);
      await updateProfile(createClient(), profile.id, { theme: resetTheme });
      setSavedState({ theme: resetTheme, selected });
      router.refresh();
    } finally {
      setResettingPanel(false);
    }
  }

  function toggle(friendId: string) {
    setSelected((prev) => {
      if (prev.includes(friendId)) return prev.filter((id) => id !== friendId);
      if (prev.length >= MAX_TOP_FRIENDS) return prev;
      return [...prev, friendId];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = updateProfileSchema.safeParse({ theme });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join(".");
      setError(issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid input");
      return;
    }

    setPending(true);
    try {
      const client = createClient();
      await setTopFriends(client, profile.id, selected);
      await updateProfile(client, profile.id, parsed.data);
      setSavedState({ theme, selected });
      setSaved(true);
      router.refresh();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Edit Fellowship</h2>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted">Pick up to {MAX_TOP_FRIENDS} friends to feature, in the order you tap them.</p>
        {myFriends.length === 0 ? (
          <p className="text-sm text-muted">You don&rsquo;t have any friends yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {myFriends.map((friend) => {
              const isChecked = selected.includes(friend.profile.id);
              const position = selected.indexOf(friend.profile.id);
              return (
                <li key={friend.friendship_id}>
                  <button
                    type="button"
                    onClick={() => toggle(friend.profile.id)}
                    className={`flex w-20 flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition ${
                      isChecked ? "border-olive-dark bg-input" : "border-transparent hover:bg-input"
                    }`}
                  >
                    <div className="relative">
                      <Avatar url={friend.profile.avatar_url} username={friend.profile.username} size={48} />
                      {isChecked && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-olive-dark text-xs font-semibold text-white">
                          {position + 1}
                        </span>
                      )}
                    </div>
                    <span className="w-full truncate text-xs text-muted">@{friend.profile.username}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PanelStyleEditor
        profileId={profile.id}
        panelId="friendSpace"
        style={panelStyle}
        onChange={(next) => setTheme((prev) => withUpdatedPanelStyle(prev, "friendSpace", next))}
        onResetNow={handleResetPanelStyleNow}
        resetting={resettingPanel}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-olive-dark">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}