import type { PanelStyle, PhotoPanelFont, ProfilePanelId, ProfileTheme } from "@koino/core";

export const DEFAULT_PAGE_BACKGROUND = "#ede7d9";
export const DEFAULT_NAVBAR_BACKGROUND = "#3e4a29";
export const DEFAULT_NAVBAR_ICON_COLOR = "#ffffff";

// Broad fallback chains since these are real device/OS fonts, not bundled web fonts —
// e.g. Comic Sans MS ships with Windows/Office but not Linux, so "playful" leans on
// Bradley Hand (macOS) and Segoe Print (Windows) first, falling back to the generic
// "cursive" family keyword everywhere else rather than silently looking like Default.
// Shared by every panel's own font (PanelStyle.font) and the info panel's font.
export const FONT_STACKS: Record<PhotoPanelFont, string> = {
  default: "inherit",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  playful: "'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive",
  elegant: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
};

export const DEFAULT_PANEL_STYLE: PanelStyle = {
  background: "#f8f4ea",
  backgroundImage: null,
  border: "#dbd0b9",
  // Match the un-customized look exactly (Panel's own `border-2 rounded-2xl`,
  // `text-foreground` for both title and body — there's no accent color in the
  // real un-customized render) so turning "Panel style" on doesn't visually jump
  // before anyone touches these. accentColor defaults to match textColor exactly
  // (not a distinct brand color) specifically to sidestep contrast concerns on a
  // completely untouched default — see resolvePanelStyle's contrast warning.
  borderWidth: 2,
  cornerRadius: 16,
  textColor: "#2a2620",
  textSize: 14,
  accentColor: "#2a2620",
  font: "default",
};

// Matches the profile-themes bucket's server-side file_size_limit (see migration
// 0015) — checked client-side too so people get an immediate, readable error.
export const MAX_THEME_IMAGE_BYTES = 5 * 1024 * 1024;

/** Shape saved by every profile customized before per-panel styling existed. */
type LegacyFlatTheme = {
  pageBackground: string;
  pageBackgroundImage: string | null;
  panelBackground: string;
  panelBackgroundImage: string | null;
  panelBorder: string;
  textColor: string;
  accentColor: string;
};

function isLegacyFlatTheme(raw: object): raw is LegacyFlatTheme {
  return "panelBackground" in raw;
}

/**
 * Profiles customized before per-panel styling existed have a single flat theme
 * applied to every panel — migrate that into the new per-panel `panels` map (applying
 * the same look to all five panels, and treating the page background as customized
 * too, since the old flow only ever saved a theme at all once its one "enable" toggle
 * was on) so nothing changes visually until the user edits an individual panel or the
 * page background going forward. Also backfills anything else missing so a plain `??`
 * fallback (which would leave the object truthy-but-incomplete) can't slip through and
 * fail schema validation on save with an unhelpful "Required" error.
 */
export function resolveTheme(raw: ProfileTheme | null): ProfileTheme {
  if (!raw)
    return { pageBackground: null, pageBackgroundImage: null, navbarBackground: null, navbarIconColor: null, panels: {} };

  if (isLegacyFlatTheme(raw)) {
    const migrated: PanelStyle = {
      background: raw.panelBackground,
      backgroundImage: raw.panelBackgroundImage ?? null,
      border: raw.panelBorder,
      borderWidth: DEFAULT_PANEL_STYLE.borderWidth,
      cornerRadius: DEFAULT_PANEL_STYLE.cornerRadius,
      textColor: raw.textColor,
      textSize: DEFAULT_PANEL_STYLE.textSize,
      accentColor: raw.accentColor,
      font: DEFAULT_PANEL_STYLE.font,
    };
    return {
      pageBackground: raw.pageBackground,
      pageBackgroundImage: raw.pageBackgroundImage ?? null,
      navbarBackground: null,
      navbarIconColor: null,
      panels: {
        photo: migrated,
        latestPost: migrated,
        wall: migrated,
        footer: migrated,
        aboutMe: migrated,
        friendSpace: migrated,
      },
    };
  }

  // Drop any panel key saved before the "contact" panel was replaced by "wall" and
  // "footer" — keeping it around would make the whole theme fail schema validation
  // (its enum no longer accepts "contact") on the next unrelated save.
  const panels = { ...(raw.panels ?? {}) } as Partial<Record<string, PanelStyle>>;
  delete panels.contact;

  return {
    pageBackground: raw.pageBackground ?? null,
    pageBackgroundImage: raw.pageBackgroundImage ?? null,
    navbarBackground: raw.navbarBackground ?? null,
    navbarIconColor: raw.navbarIconColor ?? null,
    panels: panels as Partial<Record<ProfilePanelId, PanelStyle>>,
  };
}

// A panel style saved before a field like `cornerRadius` existed is truthy but
// incomplete — merge with the default so reads always see a complete object, and
// so re-saving one field (e.g. from PanelStyleEditor, which starts from this
// return value) doesn't submit the others as `undefined` and fail schema
// validation on the whole theme with an unhelpful "Required" error.
export function resolvePanelStyle(theme: ProfileTheme, panelId: ProfilePanelId): PanelStyle | null {
  const saved = theme.panels[panelId];
  if (!saved) return null;
  return { ...DEFAULT_PANEL_STYLE, ...saved };
}

/** Merges one panel's style into a full theme without disturbing the other panels. */
export function withUpdatedPanelStyle(theme: ProfileTheme, panelId: ProfilePanelId, next: PanelStyle | null): ProfileTheme {
  const panels = { ...theme.panels };
  if (next) {
    panels[panelId] = next;
  } else {
    delete panels[panelId];
  }
  return { ...theme, panels };
}