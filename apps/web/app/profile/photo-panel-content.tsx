import Image from "next/image";
import { useState } from "react";
import type {
  FamilyConnectionStatus,
  FriendshipStatus,
  PanelStyle,
  PhotoPanelTextColors,
  PhotoPanelTextSizes,
  PhotoPanelTextVisibility,
  Profile,
  ProfilePhotoSettings,
} from "@koino/core";
import { Avatar } from "../avatar";
import { AddFamilyButton } from "./add-family-button";
import { AddFriendButton } from "./add-friend-button";
import { ProfileLikeButton } from "./profile-like-button";
import { ProfileViewersButton } from "./profile-viewers-button";
import { FONT_STACKS } from "./theme";

// "active" has no entry: the status badge (BadgeRow, below) already says "Active
// member" — this sentence would just repeat it. "pending"/"suspended" keep their
// text since it carries context the badge alone doesn't (what to do next, or why
// posting is blocked), not just a duplicate label. The "Say hello" flow itself
// no longer lives inline here — it was crowding the profile page and getting in
// the way of editing; the wave icon (sidebar / mobile header) is the permanent
// entry point for it now, everywhere in the app including this page.
const STATUS_COPY: Record<string, string> = {
  pending: "You're new here. Tap the wave icon above to say hello and connect with a leader.",
  suspended: "Your account has been suspended.",
};

export const DEFAULT_PHOTO_SETTINGS: ProfilePhotoSettings = {
  layout: "centered",
  avatarShape: "circle",
  avatarSize: 144,
  avatarCornerRadius: 0,
  avatarBorderWidth: 0,
  avatarBorderColor: "#ffffff",
  font: "default",
  textSizes: { username: 14, bio: 14, meta: 14, hobbies: 12 },
  textColors: { username: null, bio: null, meta: null, hobbies: null },
  textVisibility: { username: true, bio: true, meta: true, hobbies: true },
  coverImageUrl: null,
};

// Profiles saved before font/textSizes/textColors/avatar-border-and-radius existed
// have a truthy but incomplete photo_settings blob — a plain `?? DEFAULT_PHOTO_SETTINGS`
// wouldn't backfill those missing fields, so merge field-by-field instead. Also migrates
// renamed avatar shapes ("rounded" -> "diamond", "flower" -> "clover") — left as-is,
// they'd no longer match the AvatarShape enum and fail schema validation on the next save.
const RENAMED_AVATAR_SHAPES: Record<string, ProfilePhotoSettings["avatarShape"]> = {
  rounded: "diamond",
  flower: "clover",
};

export function resolvePhotoSettings(saved: ProfilePhotoSettings | null): ProfilePhotoSettings {
  if (!saved) return DEFAULT_PHOTO_SETTINGS;
  const avatarShape = RENAMED_AVATAR_SHAPES[saved.avatarShape as string] ?? saved.avatarShape;
  return {
    ...DEFAULT_PHOTO_SETTINGS,
    ...saved,
    avatarShape,
    textSizes: { ...DEFAULT_PHOTO_SETTINGS.textSizes, ...saved.textSizes },
    textColors: { ...DEFAULT_PHOTO_SETTINGS.textColors, ...saved.textColors },
    textVisibility: { ...DEFAULT_PHOTO_SETTINGS.textVisibility, ...saved.textVisibility },
  };
}

// Panels are resized independently of the viewport (via the rearrange grid) as well
// as by screen size, so sizing responds to the panel's own rendered width (a CSS
// container query, via `containerType: "inline-size"` on the outer wrapper below)
// rather than the viewport — either way the panel gets narrow, chosen sizes now scale
// down instead of overflowing/wrapping badly, while never disappearing below a
// readable floor. The chosen px value is always the *ceiling*: panels with room to
// spare still render at exactly the size picked in the editor.
//
// The container query MUST live on the outer wrapper, not on a per-layout text
// column: a `cqw` container's own size has to be determined independently of its
// content (here, the wrapper is stretched to a definite width by its flex-col
// parent). A `w-fit`-sized text column's width depends on its content, and that
// content's font-size would depend on the column's width via `cqw` — a circular
// dependency that CSS resolves by treating the container as indefinite, collapsing
// every cqw value to 0. We hit exactly this (every size pinned to its floor) before
// working out why. For layouts where the avatar sits beside the text, we instead
// account for the avatar's own footprint in the reference width in JS (a known
// value, not a layout-dependent one) so the text still gets a sane share.
//
// `referenceWidth` is "the outer container width at which text reaches its full
// chosen size" (the clamp() formula hits its max exactly when container ==
// referenceWidth). Since avatar-adjacent text only gets the *remainder* of the
// outer width after the avatar, it needs the outer container to be bigger before
// its own share is roomy enough for full size — so the avatar's footprint is
// ADDED to the reference, not subtracted (subtracting made text hit max even
// sooner, the opposite of what avatar-adjacent text needs — caught this by
// checking the actual computed font-size at a deliberately narrow width).
const RESPONSIVE_REFERENCE_WIDTH = 320;
const TEXT_MIN_PX = 10;
const AVATAR_MIN_PX = 40;
const AVATAR_GAP_OVERHEAD = 40; // flex gap + divider/padding between avatar and text

function responsiveTextSize(px: number, referenceWidth = RESPONSIVE_REFERENCE_WIDTH): string {
  return `clamp(${TEXT_MIN_PX}px, ${((px / referenceWidth) * 100).toFixed(3)}cqw, ${px}px)`;
}

// `color` is null unless the viewer explicitly overrode this field's color — leave
// it unset otherwise so the text keeps inheriting the panel's own text color.
function textStyle(px: number, color: string | null, referenceWidth?: number): React.CSSProperties {
  const fontSize = responsiveTextSize(px, referenceWidth);
  return color ? { fontSize, color } : { fontSize };
}

function sidebarTextReferenceWidth(avatarSize: number): number {
  return RESPONSIVE_REFERENCE_WIDTH + avatarSize + AVATAR_GAP_OVERHEAD;
}

function responsiveAvatarSize(px: number): string {
  const min = Math.min(AVATAR_MIN_PX, px);
  return `clamp(${min}px, ${((px / RESPONSIVE_REFERENCE_WIDTH) * 100).toFixed(3)}cqw, ${px}px)`;
}

function computeAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function MetaLine({
  target,
  size,
  color,
  referenceWidth,
}: {
  target: Profile;
  size: number;
  color: string | null;
  referenceWidth?: number;
}) {
  const age = computeAge(target.birthday);
  const parts = [
    target.gender ? (target.gender === "male" ? "Male" : "Female") : null,
    age !== null ? `${age} years old` : null,
    target.location || null,
  ].filter((part): part is string => !!part);

  if (parts.length === 0) return null;
  return (
    <p className="opacity-80" style={textStyle(size, color, referenceWidth)}>
      {parts.join(" · ")}
    </p>
  );
}

function StatsLine({
  profileId,
  isSelf,
  likeCount,
  viewerCount,
  totalViewCount,
}: {
  profileId: string;
  isSelf: boolean;
  likeCount: number;
  viewerCount: number;
  totalViewCount: number;
}) {
  return (
    <p className="text-xs opacity-60">
      ♥ {likeCount} {likeCount === 1 ? "like" : "likes"} ·{" "}
      {isSelf ? (
        <ProfileViewersButton profileId={profileId} viewerCount={viewerCount} />
      ) : (
        <>
          {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
        </>
      )}{" "}
      · {totalViewCount} total {totalViewCount === 1 ? "view" : "views"}
    </p>
  );
}

type Badge = { label: string; className: string };

// Panel backgrounds are user-customizable (theme_color, background images), so a
// translucent badge tint can wash out against a matching background — these are
// solid/opaque, with a text color chosen for contrast against that fixed color,
// so the badge stays readable no matter what's behind it.
//
// A full tier badge, shown to every viewer — one per profile, most-specific tier
// wins. Suspended overrides everything else (a suspended leader shouldn't still
// display "Leader" as if nothing happened); otherwise role beats verified beats
// plain active, since a leader/admin's posts auto-approve regardless of the
// verified flag. "Guest" matches the term used elsewhere for a pending account
// (auth-form.tsx, the status explainer below).
function publicTierBadge(target: Profile): Badge | null {
  if (target.status === "suspended") return { label: "Suspended", className: "bg-danger text-white" };
  if (target.role === "admin") return { label: "♛ Admin", className: "bg-bronze text-white" };
  if (target.role === "leader") return { label: "★ Leader", className: "bg-plum text-white" };
  if (target.verified) return { label: "✓ Verified", className: "bg-olive-dark text-white" };
  if (target.status === "active") return { label: "Active member", className: "bg-olive text-white" };
  if (target.status === "pending") return { label: "Guest", className: "bg-gold text-white" };
  return null;
}

function BadgeRow({ target }: { target: Profile }) {
  const badge = publicTierBadge(target);
  if (!badge) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
    </div>
  );
}

// Self-viewers edit via the panel's own corner Edit button now — this slot shows
// other viewers the like button, plus a way to add the owner as a friend.
function ActionSlot({
  isSelf,
  viewer,
  target,
  initiallyLiked,
  friendStatus,
  familyStatus,
  onLikeToggle,
  requireAuth,
}: {
  isSelf: boolean;
  viewer: Profile | null;
  target: Profile;
  initiallyLiked: boolean;
  friendStatus: FriendshipStatus;
  familyStatus: FamilyConnectionStatus;
  onLikeToggle: (liked: boolean) => void;
  requireAuth: (action: () => void) => void;
}) {
  if (isSelf || !viewer) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProfileLikeButton
        viewer={viewer}
        profileId={target.id}
        initiallyLiked={initiallyLiked}
        onToggle={onLikeToggle}
        requireAuth={requireAuth}
      />
      <AddFriendButton viewer={viewer} targetId={target.id} initialStatus={friendStatus} />
      <AddFamilyButton viewer={viewer} targetId={target.id} initialStatus={familyStatus} />
    </div>
  );
}

function IdentityDetails({
  target,
  isSelf,
  likeCount,
  viewerCount,
  totalViewCount,
  textSizes,
  textColors,
  textVisibility,
  referenceWidth,
}: {
  target: Profile;
  isSelf: boolean;
  likeCount: number;
  viewerCount: number;
  totalViewCount: number;
  textSizes: PhotoPanelTextSizes;
  textColors: PhotoPanelTextColors;
  textVisibility: PhotoPanelTextVisibility;
  referenceWidth?: number;
}) {
  return (
    <>
      <BadgeRow target={target} />
      {textVisibility.bio && target.bio && <p style={textStyle(textSizes.bio, textColors.bio, referenceWidth)}>{target.bio}</p>}
      {textVisibility.meta && <MetaLine target={target} size={textSizes.meta} color={textColors.meta} referenceWidth={referenceWidth} />}
      {textVisibility.hobbies && target.hobbies && (
        <p className="opacity-70" style={textStyle(textSizes.hobbies, textColors.hobbies, referenceWidth)}>
          Hobbies: {target.hobbies}
        </p>
      )}
      <p className="text-xs opacity-60">Member since {new Date(target.created_at).toLocaleDateString()}</p>
      {isSelf && STATUS_COPY[target.status] && <p className="text-xs opacity-60">{STATUS_COPY[target.status]}</p>}
      <StatsLine profileId={target.id} isSelf={isSelf} likeCount={likeCount} viewerCount={viewerCount} totalViewCount={totalViewCount} />
    </>
  );
}

export function PhotoPanelContent({
  target,
  viewer,
  isSelf,
  style,
  photoSettings,
  likeCount: initialLikeCount,
  viewerCount,
  totalViewCount,
  initiallyLiked,
  friendStatus,
  familyStatus,
  requireAuth,
}: {
  target: Profile;
  viewer: Profile | null;
  isSelf: boolean;
  style: PanelStyle | null;
  photoSettings: ProfilePhotoSettings;
  likeCount: number;
  viewerCount: number;
  totalViewCount: number;
  initiallyLiked: boolean;
  friendStatus: FriendshipStatus;
  familyStatus: FamilyConnectionStatus;
  requireAuth: (action: () => void) => void;
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const onLikeToggle = (liked: boolean) => setLikeCount((c) => c + (liked ? 1 : -1));
  const { textSizes, textColors, textVisibility } = photoSettings;
  const sidebarRef = sidebarTextReferenceWidth(photoSettings.avatarSize);
  const action = (
    <ActionSlot
      isSelf={isSelf}
      viewer={viewer}
      target={target}
      initiallyLiked={initiallyLiked}
      friendStatus={friendStatus}
      familyStatus={familyStatus}
      onLikeToggle={onLikeToggle}
      requireAuth={requireAuth}
    />
  );

  let content: React.ReactNode;

  if (photoSettings.layout === "side-by-side") {
    // items-start, not items-center: at a narrow container + long wrapped text, the
    // text column's height can balloon far past the avatar's — centering a short
    // item against a since-grown-huge row pushes it way down, out of view entirely.
    // Top-aligning keeps the avatar pinned to the first line regardless of how tall
    // the text block gets. Caught by testing max text sizes in a narrow panel and
    // finding the avatar effectively disappeared (rendered ~1300px below the fold).
    content = (
      <div className="flex w-fit min-w-0 max-w-full items-start gap-4">
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(photoSettings.avatarSize)}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
        <div className="flex max-w-sm min-w-0 flex-col gap-1 break-words text-left">
          {textVisibility.username && (
            <p className="opacity-80" style={textStyle(textSizes.username, textColors.username, sidebarRef)}>
              @{target.username}
            </p>
          )}
          <IdentityDetails
            target={target}
            isSelf={isSelf}
            likeCount={likeCount}
            viewerCount={viewerCount}
            totalViewCount={totalViewCount}
            textSizes={textSizes}
            textColors={textColors}
            textVisibility={textVisibility}
            referenceWidth={sidebarRef}
          />
          {action}
        </div>
      </div>
    );
  } else if (photoSettings.layout === "right") {
    // "Showcase" — not just "side-by-side" with the avatar moved: the text reads
    // toward the avatar (right-aligned, hugging the right edge of its column)
    // instead of away from it, so the whole block reads as one composition
    // pointed at the portrait rather than a mirrored copy of the other layout.
    // Same items-start reasoning as "side-by-side" — top-align so a tall wrapped
    // text column can't push the avatar out of view.
    content = (
      <div className="flex w-fit min-w-0 max-w-full items-start gap-4">
        <div className="flex max-w-sm min-w-0 flex-col items-end gap-1 break-words text-right">
          {textVisibility.username && (
            <p className="opacity-80" style={textStyle(textSizes.username, textColors.username, sidebarRef)}>
              @{target.username}
            </p>
          )}
          <IdentityDetails
            target={target}
            isSelf={isSelf}
            likeCount={likeCount}
            viewerCount={viewerCount}
            totalViewCount={totalViewCount}
            textSizes={textSizes}
            textColors={textColors}
            textVisibility={textVisibility}
            referenceWidth={sidebarRef}
          />
          {action}
        </div>
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(photoSettings.avatarSize)}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
      </div>
    );
  } else if (photoSettings.layout === "card") {
    // Plain items-center (not the items-start used on "side-by-side"): at extreme
    // settings (max text size in a very narrow panel), the text column's wrapped
    // height can still dwarf the avatar's, so centering puts the avatar far down
    // the row instead of at the top. `-safe` alignment doesn't help here — it only
    // guards an item that's itself bigger than its own alignment space, not a
    // smaller item centered against a sibling that inflated the shared line
    // height. But the outer wrapper's own safe-centering (see below) still keeps
    // the *top* of the content reachable at scroll position 0, and scrolling
    // further still reaches the avatar — it's just no longer immediately visible,
    // same degradation every other layout already accepts at these extremes.
    content = (
      <div className="flex w-fit min-w-0 max-w-full items-center gap-4">
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(photoSettings.avatarSize)}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
        <div
          className="flex max-w-sm min-w-0 flex-col justify-center gap-1 break-words border-l pl-4 text-left"
          style={style ? { borderColor: style.border } : undefined}
        >
          {textVisibility.username && (
            <p className="opacity-80" style={textStyle(textSizes.username, textColors.username, sidebarRef)}>
              @{target.username}
            </p>
          )}
          <IdentityDetails
            target={target}
            isSelf={isSelf}
            likeCount={likeCount}
            viewerCount={viewerCount}
            totalViewCount={totalViewCount}
            textSizes={textSizes}
            textColors={textColors}
            textVisibility={textVisibility}
            referenceWidth={sidebarRef}
          />
          {action}
        </div>
      </div>
    );
  } else if (photoSettings.layout === "card-right") {
    // "Showcase with divider" — the mirror of "Card with divider": text (right-
    // aligned) then a divider then the avatar, instead of avatar-divider-text.
    // Same items-center trade-off as "card" above.
    content = (
      <div className="flex w-fit min-w-0 max-w-full items-center gap-4">
        <div
          className="flex max-w-sm min-w-0 flex-col items-end justify-center gap-1 break-words border-r pr-4 text-right"
          style={style ? { borderColor: style.border } : undefined}
        >
          {textVisibility.username && (
            <p className="opacity-80" style={textStyle(textSizes.username, textColors.username, sidebarRef)}>
              @{target.username}
            </p>
          )}
          <IdentityDetails
            target={target}
            isSelf={isSelf}
            likeCount={likeCount}
            viewerCount={viewerCount}
            totalViewCount={totalViewCount}
            textSizes={textSizes}
            textColors={textColors}
            textVisibility={textVisibility}
            referenceWidth={sidebarRef}
          />
          {action}
        </div>
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(photoSettings.avatarSize)}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
      </div>
    );
  } else if (photoSettings.layout === "banner") {
    content = (
      <div className="flex w-full flex-col gap-3">
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-olive to-olive-dark">
          {target.avatar_url && <Image src={target.avatar_url} alt={target.username} fill className="object-cover" />}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            {textVisibility.username && <p className="text-sm text-white/80">@{target.username}</p>}
          </div>
        </div>
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2 break-words text-center">
          <IdentityDetails
            target={target}
            isSelf={isSelf}
            likeCount={likeCount}
            viewerCount={viewerCount}
            totalViewCount={totalViewCount}
            textSizes={textSizes}
            textColors={textColors}
            textVisibility={textVisibility}
          />
          {action}
        </div>
      </div>
    );
  } else if (photoSettings.layout === "cover") {
    content = (
      <div className="flex w-full flex-col">
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-t-xl bg-gradient-to-br from-olive to-olive-dark">
          {photoSettings.coverImageUrl && (
            <Image src={photoSettings.coverImageUrl} alt="" fill className="object-cover" />
          )}
        </div>
        <div className="mx-auto flex w-fit min-w-0 max-w-full flex-col items-start gap-2 break-words px-1 text-left">
          <div className="-mt-10 shrink-0">
            <Avatar
              url={target.avatar_url}
              username={target.username}
              size={responsiveAvatarSize(Math.min(photoSettings.avatarSize, 112))}
              shape={photoSettings.avatarShape}
              cornerRadius={photoSettings.avatarCornerRadius}
              borderWidth={photoSettings.avatarBorderWidth}
              borderColor={photoSettings.avatarBorderColor}
            />
          </div>
          {textVisibility.username && (
            <p className="opacity-80" style={textStyle(textSizes.username, textColors.username)}>
              @{target.username}
            </p>
          )}
          <div className="max-w-sm break-words">
            <IdentityDetails
              target={target}
              isSelf={isSelf}
              likeCount={likeCount}
              viewerCount={viewerCount}
              totalViewCount={totalViewCount}
              textSizes={textSizes}
              textColors={textColors}
              textVisibility={textVisibility}
            />
          </div>
          {action}
        </div>
      </div>
    );
  } else if (photoSettings.layout === "compact") {
    // No BadgeRow here — compact is a single tight row with no space to spare.
    content = (
      <div className="flex w-fit min-w-0 max-w-full items-center gap-3">
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(Math.min(photoSettings.avatarSize, 56))}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-medium">{target.display_name || `@${target.username}`}</p>
          {textVisibility.username && (
            <p className="truncate opacity-70" style={textStyle(textSizes.username, textColors.username, sidebarTextReferenceWidth(56))}>
              @{target.username}
            </p>
          )}
        </div>
        {action}
      </div>
    );
  } else if (photoSettings.layout === "spotlight") {
    content = (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 break-words text-center">
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(photoSettings.avatarSize)}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
        {textVisibility.username && (
          <p className="opacity-80" style={textStyle(textSizes.username, textColors.username)}>
            @{target.username}
          </p>
        )}
        <BadgeRow target={target} />
        {textVisibility.bio && target.bio && (
          <blockquote className="italic leading-snug" style={textStyle(textSizes.bio, textColors.bio)}>
            &ldquo;{target.bio}&rdquo;
          </blockquote>
        )}
        <StatsLine profileId={target.id} isSelf={isSelf} likeCount={likeCount} viewerCount={viewerCount} totalViewCount={totalViewCount} />
        {action}
      </div>
    );
  } else if (photoSettings.layout === "bottom") {
    // "Signature" — not just "Centered" with the avatar moved: a divider marks
    // the text as the lead content and the avatar as a small accent closing it
    // out (like a signature under a note), rather than two equally-weighted
    // blocks in a different order. The avatar is capped smaller for the same
    // reason "Compact"/"Cover" cap theirs — it's not meant to be the focal point.
    content = (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 break-words text-center">
        {textVisibility.username && (
          <p className="opacity-80" style={textStyle(textSizes.username, textColors.username)}>
            @{target.username}
          </p>
        )}
        <IdentityDetails
          target={target}
          isSelf={isSelf}
          likeCount={likeCount}
          viewerCount={viewerCount}
          totalViewCount={totalViewCount}
          textSizes={textSizes}
          textColors={textColors}
          textVisibility={textVisibility}
        />
        <div className="my-1 h-px w-16 shrink-0 opacity-30" style={{ backgroundColor: style ? style.border : "currentColor" }} />
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(Math.min(photoSettings.avatarSize, 96))}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
        {action}
      </div>
    );
  } else {
    // centered (default)
    content = (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 break-words text-center">
        <Avatar
          url={target.avatar_url}
          username={target.username}
          size={responsiveAvatarSize(photoSettings.avatarSize)}
          shape={photoSettings.avatarShape}
          cornerRadius={photoSettings.avatarCornerRadius}
          borderWidth={photoSettings.avatarBorderWidth}
          borderColor={photoSettings.avatarBorderColor}
        />
        {textVisibility.username && (
          <p className="opacity-80" style={textStyle(textSizes.username, textColors.username)}>
            @{target.username}
          </p>
        )}
        <IdentityDetails
          target={target}
          isSelf={isSelf}
          likeCount={likeCount}
          viewerCount={viewerCount}
          totalViewCount={totalViewCount}
          textSizes={textSizes}
          textColors={textColors}
          textVisibility={textVisibility}
        />
        {action}
      </div>
    );
  }

  // Panels can be resized much bigger than the content's natural size — center the
  // block in the available space instead of leaving it stranded at the top-left.
  // Text color comes from the panel's own style (or the default foreground), applied
  // by the enclosing Panel component — this only needs to control the font family.
  // `containerType: inline-size` turns this into the container the `cqw` units in
  // responsiveTextSize/responsiveAvatarSize measure against.
  //
  // `overflow-y-auto` here matters: when maxed-out sizes make `content` taller than
  // this wrapper's own allotted height, `justify-center` grows it symmetrically past
  // the wrapper's box in *both* directions rather than clipping it — with no
  // overflow handling of its own, that overflow visually paints over the panel's
  // title row above (a sibling, not a descendant, of this wrapper) since nothing
  // stops one flex item's oversized render from bleeding into another's space. This
  // makes the wrapper own its overflow instead of leaking it upward.
  //
  // Plain `justify-center`/`items-center` on a scrollable flex container has its own
  // gotcha at extreme overflow (max text/avatar sizes in a narrow, short panel): a
  // centered oversized child gets pushed equally past both ends of the box, but
  // `scrollTop` can never go negative — so the content "before" the centered start
  // point (here, everything above the vertical midpoint, e.g. a Banner layout's whole
  // image) becomes permanently unreachable, not just clipped. `-safe` keeps the
  // centering when content fits, but falls back to start-alignment once it doesn't,
  // so the top of the content is always the first thing scrolled into view. Caught by
  // testing max sizes in a deliberately small panel and finding the banner image
  // simply never rendered on screen, scrollable or not.
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center-safe justify-center-safe overflow-y-auto"
      style={{ fontFamily: FONT_STACKS[photoSettings.font], containerType: "inline-size" }}
    >
      {content}
    </div>
  );
}