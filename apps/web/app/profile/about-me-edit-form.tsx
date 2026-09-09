"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateProfileSchema } from "@koino/core";
import type { Profile, ProfileTheme } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { PanelStyleEditor } from "./panel-style-editor";
import { resolvePanelStyle, resolveTheme, withUpdatedPanelStyle } from "./theme";

export function AboutMeEditForm({
  profile,
  onSaved,
  onDirtyChange,
}: {
  profile: Profile;
  onSaved?: () => void;
  /** Reports whether the form has unsaved changes, so the surrounding modal can
   * confirm before discarding them on close. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [aboutMe, setAboutMe] = useState(profile.about_me ?? "");
  const [theme, setTheme] = useState<ProfileTheme>(resolveTheme(profile.theme));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resettingPanel, setResettingPanel] = useState(false);
  // Tracks the last-saved value (not just the initial one) so a successful save
  // or instant reset can move the baseline forward — otherwise isDirty would
  // stay stuck true after those, incorrectly prompting to discard changes that
  // are already saved.
  const [savedState, setSavedState] = useState({ aboutMe, theme });
  const isDirty = JSON.stringify({ aboutMe, theme }) !== JSON.stringify(savedState);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const panelStyle = resolvePanelStyle(theme, "aboutMe");

  async function handleResetPanelStyleNow() {
    if (!window.confirm("Reset this panel's background, border, and colors back to default?")) return;
    setResettingPanel(true);
    try {
      const resetTheme = withUpdatedPanelStyle(theme, "aboutMe", null);
      setTheme(resetTheme);
      await updateProfile(createClient(), profile.id, { theme: resetTheme });
      setSavedState({ aboutMe, theme: resetTheme });
      router.refresh();
    } finally {
      setResettingPanel(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = updateProfileSchema.safeParse({ about_me: aboutMe || undefined, theme });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join(".");
      setError(issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid input");
      return;
    }

    setPending(true);
    try {
      await updateProfile(createClient(), profile.id, parsed.data);
      setSavedState({ aboutMe, theme });
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
      <h2 className="text-lg font-semibold text-foreground">Edit About Me</h2>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted" htmlFor="about-me">
          About me
        </label>
        <textarea
          id="about-me"
          className="rounded-xl border border-card-border bg-input px-4 py-2 text-foreground outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50"
          rows={6}
          placeholder="Tell people a bit more about you…"
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          maxLength={2000}
        />
      </div>

      <PanelStyleEditor
        profileId={profile.id}
        panelId="aboutMe"
        style={panelStyle}
        onChange={(next) => setTheme((prev) => withUpdatedPanelStyle(prev, "aboutMe", next))}
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