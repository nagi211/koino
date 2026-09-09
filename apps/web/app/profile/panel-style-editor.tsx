"use client";

import { useState } from "react";
import { contrastRatio, MIN_NAVBAR_CONTRAST_RATIO, PHOTO_PANEL_FONTS } from "@koino/core";
import type { PanelStyle, PhotoPanelFont, ProfilePanelId } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PANEL_STYLE, FONT_STACKS, MAX_THEME_IMAGE_BYTES } from "./theme";

const FONT_LABELS: Record<PhotoPanelFont, string> = {
  default: "Default",
  serif: "Serif",
  mono: "Monospace",
  playful: "Playful",
  elegant: "Elegant",
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-14 cursor-pointer rounded border border-card-border bg-transparent"
      />
    </label>
  );
}

// DEFAULT_PANEL_STYLE's colors are a light-mode snapshot (hex values can't hold
// a `var(--card)` reference — hexColor is validated by the schema, and inline
// styles need a literal value anyway). Reading the CSS custom properties live —
// only at the moment "Enable" is actually checked — instead means the value we
// save matches whatever the viewer's real light/dark rendering already looks
// like, so turning customization on and saving without touching anything is a
// true no-op. Read once here rather than kept in sync continuously, since once
// `style` is a real saved object it no longer tracks these variables anyway —
// same as the plain default already didn't.
function liveDefaultPanelStyle(): PanelStyle {
  if (typeof window === "undefined") return DEFAULT_PANEL_STYLE;
  const root = getComputedStyle(document.documentElement);
  const read = (variable: string, fallback: string) => root.getPropertyValue(variable).trim() || fallback;
  const foreground = read("--foreground", DEFAULT_PANEL_STYLE.textColor);
  return {
    ...DEFAULT_PANEL_STYLE,
    background: read("--card", DEFAULT_PANEL_STYLE.background),
    border: read("--card-border", DEFAULT_PANEL_STYLE.border),
    textColor: foreground,
    accentColor: foreground,
  };
}

function SliderField({
  label,
  value,
  min = 0,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-olive-dark"
      />
      <span className="w-10 shrink-0 text-right text-xs text-muted">
        {value}
        {unit}
      </span>
    </label>
  );
}

export function PanelStyleEditor({
  profileId,
  panelId,
  style,
  onChange,
  onResetNow,
  resetting,
}: {
  profileId: string;
  panelId: ProfilePanelId;
  style: PanelStyle | null;
  onChange: (next: PanelStyle | null) => void;
  /** Immediately resets and saves just this panel's style, independent of the
   * form's own Save button — the parent owns this since it needs the *full*
   * theme (page background, navbar, other panels) to safely persist without
   * clobbering everything else in the same jsonb column. */
  onResetNow?: () => void;
  resetting?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customized = !!style;
  const current = style ?? DEFAULT_PANEL_STYLE;

  // Same contrast check as the info panel's per-field text colors, applied here
  // to the panel's own text/accent color against its own background — skipped
  // when a background image is active, since contrast against a photo isn't
  // meaningfully computable (and the panel already forces white text there).
  const hasImage = !!current.backgroundImage;
  function colorWarning(color: string): string | null {
    if (hasImage) return null;
    if (contrastRatio(color, current.background) >= MIN_NAVBAR_CONTRAST_RATIO) return null;
    return "Hard to read against the background.";
  }
  const textColorWarning = colorWarning(current.textColor);
  const accentColorWarning = colorWarning(current.accentColor);

  function updateStyle(patch: Partial<PanelStyle>) {
    onChange({ ...current, ...patch });
  }

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
      const path = `${profileId}/panel-${panelId}${ext ? `.${ext}` : ""}`;
      const { error: uploadError } = await client.storage.from("profile-themes").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = client.storage.from("profile-themes").getPublicUrl(path);
      updateStyle({ backgroundImage: `${data.publicUrl}?t=${Date.now()}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Panel style</span>
        <div className="flex items-center gap-3">
          {customized && onResetNow && (
            <button type="button" disabled={resetting} onClick={onResetNow} className="text-xs text-danger hover:underline disabled:opacity-50">
              {resetting ? "Resetting…" : "Reset"}
            </button>
          )}
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={customized}
              onChange={(e) => onChange(e.target.checked ? liveDefaultPanelStyle() : null)}
              className="h-4 w-4 accent-olive-dark"
            />
            Enable
          </label>
        </div>
      </div>

      {customized && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <ColorField label="Background" value={current.background} onChange={(v) => updateStyle({ background: v })} />
            <ColorField label="Border" value={current.border} onChange={(v) => updateStyle({ border: v })} />
            <div className="flex flex-col gap-1">
              <ColorField label="Text color" value={current.textColor} onChange={(v) => updateStyle({ textColor: v })} />
              {textColorWarning && <p className="text-xs text-danger">{textColorWarning}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <ColorField label="Accent color (heading)" value={current.accentColor} onChange={(v) => updateStyle({ accentColor: v })} />
              {accentColorWarning && <p className="text-xs text-danger">{accentColorWarning}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SliderField label="Border size" value={current.borderWidth} max={12} unit="px" onChange={(v) => updateStyle({ borderWidth: v })} />
            <SliderField
              label="Corner radius"
              value={current.cornerRadius}
              max={40}
              unit="px"
              onChange={(v) => updateStyle({ cornerRadius: v })}
            />
            <SliderField
              label="Text size"
              value={current.textSize}
              min={10}
              max={32}
              unit="px"
              onChange={(v) => updateStyle({ textSize: v })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Font</label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_PANEL_FONTS.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => updateStyle({ font })}
                  style={{ fontFamily: FONT_STACKS[font] }}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    current.font === font ? "border-olive-dark bg-input text-foreground" : "border-card-border text-muted hover:text-foreground"
                  }`}
                >
                  {FONT_LABELS[font]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <label className="cursor-pointer text-olive-dark hover:underline">
              {uploading ? "Uploading…" : current.backgroundImage ? "Change background image" : "Add background image"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploading} />
            </label>
            {current.backgroundImage && (
              <button type="button" onClick={() => updateStyle({ backgroundImage: null })} className="text-muted hover:text-foreground">
                Remove image
              </button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-xs text-muted">
            A background image takes priority over the background color. Max {Math.round(MAX_THEME_IMAGE_BYTES / (1024 * 1024))}MB.
          </p>
        </div>
      )}
    </div>
  );
}