"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { contrastRatio, MIN_NAVBAR_CONTRAST_RATIO, updateProfile, updateProfileSchema } from "@koino/core";
import type { Profile, ProfileTheme } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_NAVBAR_BACKGROUND, DEFAULT_NAVBAR_ICON_COLOR, DEFAULT_PAGE_BACKGROUND, MAX_THEME_IMAGE_BYTES, resolveTheme } from "./theme";

export function PageBackgroundForm({
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
  const [theme, setTheme] = useState<ProfileTheme>(resolveTheme(profile.theme));
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resettingPage, setResettingPage] = useState(false);
  const [resettingNavbar, setResettingNavbar] = useState(false);
  // Tracks the last-saved value (not just the initial one) so a successful save
  // or instant reset can move the baseline forward — otherwise isDirty would
  // stay stuck true after those, incorrectly prompting to discard changes that
  // are already saved.
  const [savedTheme, setSavedTheme] = useState(theme);
  const isDirty = JSON.stringify(theme) !== JSON.stringify(savedTheme);
  const customized = theme.pageBackground !== null;
  const navbarCustomized = theme.navbarBackground !== null;
  const navbarIconCustomized = theme.navbarIconColor !== null;
  const navbarColorsCollide =
    navbarCustomized &&
    navbarIconCustomized &&
    contrastRatio(theme.navbarBackground!, theme.navbarIconColor!) < MIN_NAVBAR_CONTRAST_RATIO;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function updateTheme(patch: Partial<ProfileTheme>) {
    setTheme((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }

  async function resetNow(patch: Partial<ProfileTheme>, setResetting: (v: boolean) => void, message: string) {
    if (!window.confirm(message)) return;
    setResetting(true);
    try {
      const resetTheme = { ...theme, ...patch };
      setTheme(resetTheme);
      await updateProfile(createClient(), profile.id, { theme: resetTheme });
      setSavedTheme(resetTheme);
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  const handleResetPageBackgroundNow = () =>
    resetNow(
      { pageBackground: null, pageBackgroundImage: null },
      setResettingPage,
      "Reset the page background back to default?"
    );

  const handleResetNavbarNow = () =>
    resetNow(
      { navbarBackground: null, navbarIconColor: null },
      setResettingNavbar,
      "Reset the navbar background and icon/text color back to default?"
    );

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_THEME_IMAGE_BYTES) {
      setError(`Image must be under ${Math.round(MAX_THEME_IMAGE_BYTES / (1024 * 1024))}MB`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const client = createClient();
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/theme-page${ext ? `.${ext}` : ""}`;
      const { error: uploadError } = await client.storage.from("profile-themes").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from("profile-themes").getPublicUrl(path);
      updateTheme({ pageBackgroundImage: `${data.publicUrl}?t=${Date.now()}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
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
      <h2 className="text-lg font-semibold text-foreground">Page &amp; navbar</h2>

      <div className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={customized}
              onChange={(e) =>
                updateTheme(e.target.checked ? { pageBackground: DEFAULT_PAGE_BACKGROUND } : { pageBackground: null, pageBackgroundImage: null })
              }
              className="h-4 w-4 accent-olive-dark"
            />
            Customize page background
          </label>
          {customized && (
            <button
              type="button"
              disabled={resettingPage}
              onClick={handleResetPageBackgroundNow}
              className="text-xs text-danger hover:underline disabled:opacity-50"
            >
              {resettingPage ? "Resetting…" : "Reset"}
            </button>
          )}
        </div>

        {customized && (
          <div className="flex flex-col gap-3">
            {theme.pageBackgroundImage ? (
              <p className="text-xs text-muted">
                A background image is active, so the background color below is hidden and unused — remove the image to edit the color again.
              </p>
            ) : (
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Background color</span>
                <input
                  type="color"
                  value={theme.pageBackground ?? DEFAULT_PAGE_BACKGROUND}
                  onChange={(e) => updateTheme({ pageBackground: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded border border-card-border bg-transparent"
                />
              </label>
            )}

            <div className="flex items-center gap-3 text-sm">
              <label className="cursor-pointer text-olive-dark hover:underline">
                {uploading ? "Uploading…" : theme.pageBackgroundImage ? "Change background image" : "Add background image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
              </label>
              {theme.pageBackgroundImage && (
                <button type="button" onClick={() => updateTheme({ pageBackgroundImage: null })} className="text-muted hover:text-foreground">
                  Remove image
                </button>
              )}
            </div>
            {!theme.pageBackgroundImage && (
              <p className="text-xs text-muted">
                A background image takes priority over the background color. Max {Math.round(MAX_THEME_IMAGE_BYTES / (1024 * 1024))}MB.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Navbar</span>
          {(navbarCustomized || navbarIconCustomized) && (
            <button
              type="button"
              disabled={resettingNavbar}
              onClick={handleResetNavbarNow}
              className="text-xs text-danger hover:underline disabled:opacity-50"
            >
              {resettingNavbar ? "Resetting…" : "Reset"}
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={navbarCustomized}
            onChange={(e) => updateTheme({ navbarBackground: e.target.checked ? DEFAULT_NAVBAR_BACKGROUND : null })}
            className="h-4 w-4 accent-olive-dark"
          />
          Customize navbar background
        </label>
        {navbarCustomized && (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Navbar background color</span>
            <input
              type="color"
              value={theme.navbarBackground ?? DEFAULT_NAVBAR_BACKGROUND}
              onChange={(e) => updateTheme({ navbarBackground: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border border-card-border bg-transparent"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={navbarIconCustomized}
            onChange={(e) => updateTheme({ navbarIconColor: e.target.checked ? DEFAULT_NAVBAR_ICON_COLOR : null })}
            className="h-4 w-4 accent-olive-dark"
          />
          Customize navbar icon/text color
        </label>
        {navbarIconCustomized && (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Navbar icon/text color</span>
            <input
              type="color"
              value={theme.navbarIconColor ?? DEFAULT_NAVBAR_ICON_COLOR}
              onChange={(e) => updateTheme({ navbarIconColor: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded border border-card-border bg-transparent"
            />
          </label>
        )}
        {navbarColorsCollide && (
          <p className="text-xs text-danger">
            Navbar background and icon/text color are too close in contrast — the icons and text would be hard to read. Pick more distinct colors.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-olive-dark">Saved.</p>}

      <button
        type="submit"
        disabled={pending || uploading || navbarColorsCollide}
        className="mt-1 rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}