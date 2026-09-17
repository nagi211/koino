"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_SHAPES, contrastRatio, MIN_NAVBAR_CONTRAST_RATIO, PHOTO_PANEL_FONTS, PHOTO_PANEL_LAYOUTS, updateProfile, updateProfileSchema } from "@koino/core";
import type { AvatarShape, PhotoPanelFont, PhotoPanelLayout, Profile, ProfilePhotoSettings, ProfileTheme } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";
import { AvatarCropModal } from "./avatar-crop-modal";
import { Panel } from "./panel";
import { PanelStyleEditor } from "./panel-style-editor";
import { DEFAULT_PHOTO_SETTINGS, PhotoPanelContent, resolvePhotoSettings } from "./photo-panel-content";
import { DEFAULT_PANEL_STYLE, FONT_STACKS, MAX_THEME_IMAGE_BYTES, resolvePanelStyle, resolveTheme, withUpdatedPanelStyle } from "./theme";

const PHOTO_LAYOUT_LABELS: Record<PhotoPanelLayout, string> = {
  centered: "Centered",
  "side-by-side": "Side by side",
  banner: "Banner",
  compact: "Compact",
  card: "Card with divider",
  cover: "Cover photo",
  spotlight: "Spotlight",
  bottom: "Signature",
  right: "Showcase",
  "card-right": "Showcase with divider",
};

const AVATAR_SHAPE_LABELS: Record<AvatarShape, string> = {
  circle: "Circle",
  square: "Square",
  diamond: "Diamond",
  hexagon: "Hexagon",
  octagon: "Octagon",
  clover: "Clover",
};

const PHOTO_FONT_LABELS: Record<PhotoPanelFont, string> = {
  default: "Default",
  serif: "Serif",
  mono: "Monospace",
  playful: "Playful",
  elegant: "Elegant",
};

const TEXT_SIZE_FIELDS: { key: keyof ProfilePhotoSettings["textSizes"]; label: string }[] = [
  { key: "username", label: "Username" },
  { key: "bio", label: "Bio" },
  { key: "meta", label: "Gender/age/location" },
  { key: "hobbies", label: "Hobbies" },
];

export function PhotoEditForm({
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
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [theme, setTheme] = useState<ProfileTheme>(resolveTheme(profile.theme));
  const [photoSettings, setPhotoSettings] = useState<ProfilePhotoSettings>(resolvePhotoSettings(profile.photo_settings));
  const [gender, setGender] = useState<"male" | "female" | "">(profile.gender ?? "");
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [hobbies, setHobbies] = useState(profile.hobbies ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [resettingPanel, setResettingPanel] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  // Everything the "Save changes" button submits, for dirty-checking — avatarUrl
  // is deliberately excluded, since changing the photo saves immediately on its
  // own (see handleCroppedAvatar) rather than waiting for this form's submit.
  // Tracks the last-saved value (not just the initial one) so a successful save
  // or instant reset can move the baseline forward — otherwise isDirty would
  // stay stuck true after those, incorrectly prompting to discard changes that
  // are already saved.
  const [savedState, setSavedState] = useState({ displayName, bio, theme, photoSettings, gender, birthday, location, hobbies });
  const currentState = { displayName, bio, theme, photoSettings, gender, birthday, location, hobbies };
  const isDirty = JSON.stringify(currentState) !== JSON.stringify(savedState);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const panelStyle = resolvePanelStyle(theme, "photo");

  // Per-info text colors are optional overrides — check their contrast against the
  // panel's own background, same threshold as the navbar background/icon check.
  // Skipped entirely when a background image is active: contrast against a photo
  // isn't meaningfully computable, and the panel already forces white text there.
  const panelHasImage = !!panelStyle?.backgroundImage;
  const panelBackground = (panelStyle ?? DEFAULT_PANEL_STYLE).background;

  function textColorWarning(color: string | null): string | null {
    if (!color || panelHasImage) return null;
    if (contrastRatio(color, panelBackground) >= MIN_NAVBAR_CONTRAST_RATIO) return null;
    return "Hard to read against the panel background.";
  }

  const hasTextColorContrastIssue = TEXT_SIZE_FIELDS.some(({ key }) => textColorWarning(photoSettings.textColors[key]) !== null);

  async function handleResetPanelStyleNow() {
    if (!window.confirm("Reset this panel's background, border, and colors back to default?")) return;
    setResettingPanel(true);
    try {
      const resetTheme = withUpdatedPanelStyle(theme, "photo", null);
      setTheme(resetTheme);
      await updateProfile(createClient(), profile.id, { theme: resetTheme });
      setSavedState((prev) => ({ ...prev, theme: resetTheme }));
      router.refresh();
    } finally {
      setResettingPanel(false);
    }
  }

  // Everything about this panel in one shot: layout, avatar shape/size/border/
  // corners, per-info text sizes and colors (all of it lives in photo_settings),
  // plus the panel's own background/border/corner style (theme.panels.photo) —
  // the same two things the granular resets above handle individually, saved
  // together here so this button alone can take the whole panel back to default.
  async function handleResetAllNow() {
    if (
      !window.confirm(
        "Reset the entire info panel — layout, avatar style, text sizes and colors, and panel background — back to default? This can't be undone."
      )
    )
      return;
    setResettingAll(true);
    try {
      const resetTheme = withUpdatedPanelStyle(theme, "photo", null);
      setTheme(resetTheme);
      setPhotoSettings(DEFAULT_PHOTO_SETTINGS);
      await updateProfile(createClient(), profile.id, { theme: resetTheme, photo_settings: null });
      setSavedState((prev) => ({ ...prev, theme: resetTheme, photoSettings: DEFAULT_PHOTO_SETTINGS }));
      router.refresh();
    } finally {
      setResettingAll(false);
    }
  }

  function handleAvatarFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropImageSrc(URL.createObjectURL(file));
  }

  function closeCropModal() {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  }

  async function handleCroppedAvatar(blob: Blob) {
    setError(null);
    setUploadingAvatar(true);
    try {
      const client = createClient();
      const path = `${profile.id}/avatar.png`;
      const { error: uploadError } = await client.storage.from("avatars").upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from("avatars").getPublicUrl(path);
      const newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      await updateProfile(client, profile.id, { avatar_url: newAvatarUrl });
      setAvatarUrl(newAvatarUrl);
      setSaved(true);
      closeCropModal();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCoverImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_THEME_IMAGE_BYTES) {
      setError(`Image must be under ${Math.round(MAX_THEME_IMAGE_BYTES / (1024 * 1024))}MB`);
      return;
    }
    setError(null);
    setUploadingCover(true);
    try {
      const client = createClient();
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/cover${ext ? `.${ext}` : ""}`;
      const { error: uploadError } = await client.storage.from("profile-themes").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from("profile-themes").getPublicUrl(path);
      setPhotoSettings((prev) => ({ ...prev, coverImageUrl: `${data.publicUrl}?t=${Date.now()}` }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = updateProfileSchema.safeParse({
      display_name: displayName || undefined,
      bio: bio || undefined,
      avatar_url: avatarUrl ?? undefined,
      theme,
      photo_settings: photoSettings,
      gender: gender || null,
      birthday: birthday || null,
      location: location || null,
      hobbies: hobbies || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join(".");
      setError(issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid input");
      return;
    }

    setPending(true);
    try {
      await updateProfile(createClient(), profile.id, parsed.data);
      setSavedState(currentState);
      setSaved(true);
      router.refresh();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const inputClasses =
    "rounded-xl border border-card-border bg-input px-4 py-2 text-foreground outline-none transition focus:border-olive-dark focus:ring-2 focus:ring-olive/50";

  const previewTarget: Profile = {
    ...profile,
    display_name: displayName || null,
    bio: bio || null,
    avatar_url: avatarUrl,
    gender: gender === "" ? null : gender,
    birthday: birthday || null,
    location: location || null,
    hobbies: hobbies || null,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Edit info panel</h2>
        <button
          type="button"
          disabled={resettingAll}
          onClick={handleResetAllNow}
          className="text-xs text-danger hover:underline disabled:opacity-50"
        >
          {resettingAll ? "Resetting…" : "Reset all to default"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col items-center gap-3">
          <Avatar url={avatarUrl} username={profile.username} size={96} />
          <label className="cursor-pointer text-sm text-olive-dark hover:underline">
            {uploadingAvatar ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelected} disabled={uploadingAvatar} />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Username</label>
          <p className="font-mono text-foreground">@{profile.username}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="display-name">
            Display name
          </label>
          <input
            id="display-name"
            className={inputClasses}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="bio">
            Bio
          </label>
          <textarea id="bio" className={inputClasses} rows={2} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Gender</label>
            <div className="flex gap-4 py-2 text-sm text-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "male"}
                  onChange={() => setGender("male")}
                  className="accent-olive-dark"
                />
                Male
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === "female"}
                  onChange={() => setGender("female")}
                  className="accent-olive-dark"
                />
                Female
              </label>
              {gender && (
                <button type="button" onClick={() => setGender("")} className="text-xs text-muted hover:text-foreground">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted" htmlFor="birthday">
              Birthday
            </label>
            <input id="birthday" type="date" className={inputClasses} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            className={inputClasses}
            placeholder="City, region…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="hobbies">
            Hobbies
          </label>
          <textarea
            id="hobbies"
            className={inputClasses}
            rows={2}
            placeholder="Reading, hiking, worship music…"
            value={hobbies}
            onChange={(e) => setHobbies(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
          <span className="text-sm font-medium text-foreground">Info panel style</span>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Layout</label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_PANEL_LAYOUTS.map((layout) => (
                <button
                  key={layout}
                  type="button"
                  onClick={() => setPhotoSettings((prev) => ({ ...prev, layout }))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    photoSettings.layout === layout
                      ? "border-olive-dark bg-input text-foreground"
                      : "border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {PHOTO_LAYOUT_LABELS[layout]}
                </button>
              ))}
            </div>
          </div>

          {photoSettings.layout === "cover" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Cover photo</label>
              <div className="flex items-center gap-3 text-sm">
                <label className="cursor-pointer text-olive-dark hover:underline">
                  {uploadingCover ? "Uploading…" : photoSettings.coverImageUrl ? "Change cover photo" : "Add cover photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverImageChange} disabled={uploadingCover} />
                </label>
                {photoSettings.coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoSettings((prev) => ({ ...prev, coverImageUrl: null }))}
                    className="text-muted hover:text-foreground"
                  >
                    Remove
                  </button>
                )}
              </div>
              {!photoSettings.coverImageUrl && (
                <p className="text-xs text-muted">Falls back to the default gradient. Max {Math.round(MAX_THEME_IMAGE_BYTES / (1024 * 1024))}MB.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Avatar shape</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setPhotoSettings((prev) => ({ ...prev, avatarShape: shape }))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    photoSettings.avatarShape === shape
                      ? "border-olive-dark bg-input text-foreground"
                      : "border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {AVATAR_SHAPE_LABELS[shape]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-muted">Avatar size</span>
            <input
              type="range"
              min={64}
              max={200}
              step={1}
              value={photoSettings.avatarSize}
              onChange={(e) => setPhotoSettings((prev) => ({ ...prev, avatarSize: Number(e.target.value) }))}
              className="flex-1 accent-olive-dark"
            />
            <span className="w-10 shrink-0 text-right text-xs text-muted">{photoSettings.avatarSize}px</span>
          </label>

          {photoSettings.avatarShape === "square" && (
            <label className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-muted">Corner radius</span>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={photoSettings.avatarCornerRadius}
                onChange={(e) => setPhotoSettings((prev) => ({ ...prev, avatarCornerRadius: Number(e.target.value) }))}
                className="flex-1 accent-olive-dark"
              />
              <span className="w-10 shrink-0 text-right text-xs text-muted">{photoSettings.avatarCornerRadius}%</span>
            </label>
          )}

          <label className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-muted">Border size</span>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={photoSettings.avatarBorderWidth}
              onChange={(e) => setPhotoSettings((prev) => ({ ...prev, avatarBorderWidth: Number(e.target.value) }))}
              className="flex-1 accent-olive-dark"
            />
            <span className="w-10 shrink-0 text-right text-xs text-muted">{photoSettings.avatarBorderWidth}px</span>
            <input
              type="color"
              title="Border color"
              value={photoSettings.avatarBorderColor}
              onChange={(e) => setPhotoSettings((prev) => ({ ...prev, avatarBorderColor: e.target.value }))}
              className="h-7 w-9 shrink-0 cursor-pointer rounded border border-card-border bg-transparent"
            />
          </label>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Font</label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_PANEL_FONTS.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => setPhotoSettings((prev) => ({ ...prev, font }))}
                  style={{ fontFamily: FONT_STACKS[font] }}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    photoSettings.font === font
                      ? "border-olive-dark bg-input text-foreground"
                      : "border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {PHOTO_FONT_LABELS[font]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted">Text size &amp; color</label>
            {TEXT_SIZE_FIELDS.map(({ key, label }) => {
              const colorOverride = photoSettings.textColors[key];
              const warning = textColorWarning(colorOverride);
              return (
                <div key={key} className="flex flex-col gap-1">
                  <label className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 text-muted">{label}</span>
                    <input
                      type="range"
                      min={10}
                      max={32}
                      step={1}
                      value={photoSettings.textSizes[key]}
                      onChange={(e) =>
                        setPhotoSettings((prev) => ({
                          ...prev,
                          textSizes: { ...prev.textSizes, [key]: Number(e.target.value) },
                        }))
                      }
                      className="flex-1 accent-olive-dark"
                    />
                    <span className="w-10 shrink-0 text-right text-xs text-muted">{photoSettings.textSizes[key]}px</span>
                    <input
                      type="color"
                      title={`${label} color`}
                      value={colorOverride ?? panelStyle?.textColor ?? DEFAULT_PANEL_STYLE.textColor}
                      onChange={(e) =>
                        setPhotoSettings((prev) => ({
                          ...prev,
                          textColors: { ...prev.textColors, [key]: e.target.value },
                        }))
                      }
                      className="h-7 w-9 shrink-0 cursor-pointer rounded border border-card-border bg-transparent"
                    />
                    <button
                      type="button"
                      disabled={!colorOverride}
                      onClick={() => setPhotoSettings((prev) => ({ ...prev, textColors: { ...prev.textColors, [key]: null } }))}
                      title={colorOverride ? "Revert to the panel's default color" : "Using the panel's default color"}
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs disabled:cursor-default ${
                        colorOverride ? "border-card-border text-muted hover:text-foreground" : "border-olive-dark bg-input text-foreground"
                      }`}
                    >
                      Auto
                    </button>
                    <input
                      type="checkbox"
                      checked={!photoSettings.textVisibility[key]}
                      onChange={(e) =>
                        setPhotoSettings((prev) => ({
                          ...prev,
                          textVisibility: { ...prev.textVisibility, [key]: !e.target.checked },
                        }))
                      }
                      aria-label={`Hide ${label}`}
                      title={`Hide ${label}`}
                      className="h-4 w-4 shrink-0 accent-olive-dark"
                    />
                    <span className="shrink-0 text-xs text-muted">Hide</span>
                  </label>
                  {warning && <p className="pl-[172px] text-xs text-danger">{warning}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <PanelStyleEditor
          profileId={profile.id}
          panelId="photo"
          style={panelStyle}
          onChange={(next) => setTheme((prev) => withUpdatedPanelStyle(prev, "photo", next))}
          onResetNow={handleResetPanelStyleNow}
          resetting={resettingPanel}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Preview</label>
          {/* Not pointer-events-none: the info panel renders nothing clickable in
              self-view (its like/add-friend slot only shows for other viewers), and
              blocking pointer events also blocks wheel scroll — which made the
              panel's own internal scroll area (for content taller than the preview
              box) completely unreachable, silently cutting content off with no way
              to see the rest. */}
          <div className="h-96 overflow-hidden rounded-2xl">
            <Panel style={panelStyle} title={displayName || `@${profile.username}`}>
              <PhotoPanelContent
                target={previewTarget}
                viewer={null}
                isSelf
                style={panelStyle}
                photoSettings={photoSettings}
                likeCount={0}
                viewerCount={0}
                totalViewCount={0}
                initiallyLiked={false}
                friendStatus="none"
                familyStatus="none"
                requireAuth={(action) => action()}
              />
            </Panel>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-olive-dark">Saved.</p>}

        <button
          type="submit"
          disabled={pending || uploadingAvatar || uploadingCover || hasTextColorContrastIssue}
          className="mt-1 rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {cropImageSrc && <AvatarCropModal imageSrc={cropImageSrc} onCancel={closeCropModal} onSave={handleCroppedAvatar} />}
    </div>
  );
}