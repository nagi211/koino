"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateProfileSchema } from "@koino/core";
import type { Profile, ProfilePanelId, ProfileTheme } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { PanelStyleEditor } from "./panel-style-editor";
import { resolvePanelStyle, resolveTheme, withUpdatedPanelStyle } from "./theme";

export function PanelOnlyEditForm({
  profile,
  panelId,
  title,
  onSaved,
  onDirtyChange,
}: {
  profile: Profile;
  panelId: ProfilePanelId;
  title: string;
  onSaved?: () => void;
  /** Reports whether the form has unsaved changes, so the surrounding modal can
   * confirm before discarding them on close. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<ProfileTheme>(resolveTheme(profile.theme));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resettingPanel, setResettingPanel] = useState(false);
  // Tracks the last-saved value (not just the initial one) so a successful save
  // or instant reset can move the baseline forward — otherwise isDirty would
  // stay stuck true after those, incorrectly prompting to discard changes that
  // are already saved.
  const [savedTheme, setSavedTheme] = useState(theme);
  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const panelStyle = resolvePanelStyle(theme, panelId);

  async function handleResetPanelStyleNow() {
    if (!window.confirm("Reset this panel's background, border, and colors back to default?")) return;
    setResettingPanel(true);
    try {
      const resetTheme = withUpdatedPanelStyle(theme, panelId, null);
      setTheme(resetTheme);
      await updateProfile(createClient(), profile.id, { theme: resetTheme });
      setSavedTheme(resetTheme);
      router.refresh();
    } finally {
      setResettingPanel(false);
    }
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
      await updateProfile(createClient(), profile.id, parsed.data);
      setSavedTheme(theme);
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
      <h2 className="text-lg font-semibold text-foreground">Edit {title}</h2>

      <PanelStyleEditor
        profileId={profile.id}
        panelId={panelId}
        style={panelStyle}
        onChange={(next) => setTheme((prev) => withUpdatedPanelStyle(prev, panelId, next))}
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