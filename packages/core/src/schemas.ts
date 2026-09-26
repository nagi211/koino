import { z } from "zod";
import { contrastRatio, MIN_NAVBAR_CONTRAST_RATIO } from "./color-contrast";

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24)
    .regex(/^[a-z0-9_.]+$/i, "Letters, numbers, dots, and underscores only"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const POST_BACKGROUNDS = ["sunrise", "ocean", "meadow", "berry", "dusk"] as const;
export type PostBackground = (typeof POST_BACKGROUNDS)[number];

export const createPostSchema = z
  .object({
    type: z.enum(["text", "image", "video"]),
    body: z.string().max(2000).optional(),
    media_url: z.string().url().optional(),
    background: z.enum(POST_BACKGROUNDS).optional(),
    audience: z.enum(["public", "family", "friends"]).default("public"),
  })
  .refine((data) => data.type === "text" || !!data.media_url, {
    message: "Choose a file to upload",
    path: ["media_url"],
  });
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const reportSchema = z.object({
  target_type: z.enum(["post", "message", "profile_comment"]),
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const requestVouchSchema = z.object({
  reason: z.string().min(1, "Tell us a little about why you're here").max(500),
});
export type RequestVouchInput = z.infer<typeof requestVouchSchema>;

export const commentSchema = z.object({
  post_id: z.string().uuid(),
  body: z.string().min(1, "Comment can't be empty").max(500),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const profileCommentSchema = z.object({
  profile_id: z.string().uuid(),
  body: z.string().min(1, "Comment can't be empty").max(500),
});
export type ProfileCommentInput = z.infer<typeof profileCommentSchema>;

const hexColor = z.string().regex(/^#([0-9a-f]{6})$/i, "Must be a hex color like #a1b2c3");

export const PROFILE_PANEL_IDS = ["photo", "latestPost", "wall", "footer", "aboutMe", "friendSpace", "verse"] as const;

// Shared by every panel's own text (via panelStyleSchema below) and by the info
// panel's per-field overrides (photoPanelTextSizesSchema/PHOTO_PANEL_FONTS usage
// further down) — declared here so panelStyleSchema can reference it.
export const PHOTO_PANEL_FONTS = ["default", "serif", "mono", "playful", "elegant"] as const;
const textSize = z.number().int().min(10).max(32);

// Every color is rendered directly as an inline style, so each is restricted to a
// strict hex pattern rather than accepting arbitrary CSS — profile pages are rendered
// to other visitors, so free-form CSS/HTML here would be a stored XSS vector.
export const panelStyleSchema = z.object({
  background: hexColor,
  backgroundImage: z.string().url().nullable(),
  border: hexColor,
  // Defensive `.default()`s: a panel style saved before a field like border width
  // existed is missing that key, and a bare required field would fail the whole
  // theme's validation with an unhelpful "Required" error the next time the user
  // saves anything at all — not just this panel. Same reasoning as the client-side
  // merges in resolveTheme/resolvePhotoSettings, just enforced at the schema too.
  borderWidth: z.number().int().min(0).max(12).default(2),
  cornerRadius: z.number().int().min(0).max(40).default(16),
  textColor: hexColor,
  textSize: textSize.default(14),
  accentColor: hexColor,
  font: z.enum(PHOTO_PANEL_FONTS).default("default"),
});
export type PanelStyleInput = z.infer<typeof panelStyleSchema>;

// Each panel's style is fully independent — `panels` only needs to carry entries for
// panels the user has actually customized.
export const profileThemeSchema = z
  .object({
    pageBackground: hexColor.nullable(),
    pageBackgroundImage: z.string().url().nullable(),
    navbarBackground: hexColor.nullable(),
    navbarIconColor: hexColor.nullable(),
    panels: z.record(z.enum(PROFILE_PANEL_IDS), panelStyleSchema),
  })
  .refine(
    (data) =>
      !(data.navbarBackground && data.navbarIconColor && contrastRatio(data.navbarBackground, data.navbarIconColor) < MIN_NAVBAR_CONTRAST_RATIO),
    { message: "Navbar background and icon/text color are too similar to read clearly", path: ["navbarIconColor"] }
  );
export type ProfileThemeInput = z.infer<typeof profileThemeSchema>;

// Bounded position/size data only — never raw layout markup or CSS.
export const profilePanelLayoutItemSchema = z.object({
  i: z.enum(PROFILE_PANEL_IDS),
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(200),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(60),
});
export const profileLayoutSchema = z.array(profilePanelLayoutItemSchema).max(PROFILE_PANEL_IDS.length);
export type ProfileLayoutInput = z.infer<typeof profileLayoutSchema>;

export const PHOTO_PANEL_LAYOUTS = [
  "centered",
  "side-by-side",
  "banner",
  "compact",
  "card",
  "cover",
  "spotlight",
  "bottom",
  "right",
  "card-right",
] as const;
export const AVATAR_SHAPES = ["circle", "square", "diamond", "hexagon", "octagon", "clover"] as const;

export const photoPanelTextSizesSchema = z.object({
  username: textSize,
  bio: textSize,
  meta: textSize,
  hobbies: textSize,
});

export const photoPanelTextColorsSchema = z.object({
  username: hexColor.nullable(),
  bio: hexColor.nullable(),
  meta: hexColor.nullable(),
  hobbies: hexColor.nullable(),
});

// `.default(true)` per field, same reasoning as the other `.default()`s here: a
// profile saved before per-field hiding existed is missing this object entirely,
// and without defaults that would reject any future edit to the panel, not just
// ones actually touching visibility.
export const photoPanelTextVisibilitySchema = z.object({
  username: z.boolean().default(true),
  bio: z.boolean().default(true),
  meta: z.boolean().default(true),
  hobbies: z.boolean().default(true),
});

export const profilePhotoSettingsSchema = z.object({
  layout: z.enum(PHOTO_PANEL_LAYOUTS),
  avatarShape: z.enum(AVATAR_SHAPES),
  avatarSize: z.number().int().min(64).max(200),
  // `.default()` here too: a profile saved before these fields existed is missing
  // them, and without a default the "Required" error blocks saving *any* future
  // edit to the panel, not just the ones actually touching these fields.
  avatarCornerRadius: z.number().int().min(0).max(50).default(0),
  avatarBorderWidth: z.number().int().min(0).max(12).default(0),
  avatarBorderColor: hexColor.default("#ffffff"),
  font: z.enum(PHOTO_PANEL_FONTS),
  textSizes: photoPanelTextSizesSchema,
  textColors: photoPanelTextColorsSchema,
  textVisibility: photoPanelTextVisibilitySchema,
  coverImageUrl: z.string().url().nullable().default(null),
});
export type ProfilePhotoSettingsInput = z.infer<typeof profilePhotoSettingsSchema>;

// Capped well under a whole chapter's length — this is meant to hold a single
// verse or a short range, not an entire passage, so an overly broad reference
// (e.g. a whole chapter) gets rejected rather than silently accepted and then
// looking absurd in a small panel.
export const favoriteVerseSchema = z.object({
  reference: z.string().min(1).max(100),
  text: z.string().min(1).max(1000),
  translation: z.string().min(1).max(20),
});
export type FavoriteVerseInput = z.infer<typeof favoriteVerseSchema>;

export const updateProfileSchema = z.object({
  display_name: z.string().max(60).optional(),
  bio: z.string().max(280).optional(),
  about_me: z.string().max(2000).optional(),
  avatar_url: z.string().url().optional(),
  theme: profileThemeSchema.nullable().optional(),
  layout: profileLayoutSchema.nullable().optional(),
  photo_settings: profilePhotoSettingsSchema.nullable().optional(),
  favorite_verse: favoriteVerseSchema.nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
  birthday: z.string().date().nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  hobbies: z.string().max(500).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
