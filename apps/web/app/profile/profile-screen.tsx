"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactGridLayout, { useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { updateProfile } from "@koino/core";
import type {
  FamilyConnectionStatus,
  FriendshipStatus,
  FriendshipWithProfile,
  Profile,
  ProfileCommentWithAuthor,
  ProfilePanelId,
  ProfilePanelLayoutItem,
  PostWithAuthor,
  TopFriendWithProfile,
} from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "../avatar";
import { Modal } from "../modal";
import { NotificationBell } from "../notification-bell";
import { PostComposer } from "../post-composer";
import { VouchGateModal } from "../vouch-gate-modal";
import { AboutMeEditForm } from "./about-me-edit-form";
import { AdminMemberActions } from "./admin-member-actions";
import { FriendSpaceEditForm } from "./friend-space-edit-form";
import { LatestPostPreview } from "./latest-post-preview";
import { PageBackgroundForm } from "./page-background-editor";
import { Panel } from "./panel";
import { PanelOnlyEditForm } from "./panel-only-edit-form";
import { PhotoEditForm } from "./photo-edit-form";
import { PhotoPanelContent, resolvePhotoSettings } from "./photo-panel-content";
import { ProfileWall } from "./profile-wall";
import { DEFAULT_NAVBAR_BACKGROUND, resolvePanelStyle, resolveTheme } from "./theme";
import { VerseEditForm } from "./verse-edit-form";

// Below this container width, the 12-col drag/resize grid's w:6 panels shrink to
// unusable ~170px slivers. Rather than force the grid into a single-column mode,
// mobile gets its own fixed stack instead: full-width, fixed order and height,
// not user-adjustable. Per-panel design customization (the "Edit" button —
// color/font/background) still works identically here; only position/size is
// fixed, matching what was asked for.
const MOBILE_BREAKPOINT = 640;
const MOBILE_PANEL_ORDER: ProfilePanelId[] = ["photo", "latestPost", "aboutMe", "friendSpace", "verse", "wall"];
const MOBILE_PANEL_HEIGHT: Record<string, number> = {
  // Tallest of the set: on a pending guest's own profile this holds the full
  // vouch-request flow (badge, status text, quick-pick chips, textarea, button)
  // on top of the usual avatar/bio/stats — 420 clipped that combination.
  photo: 600,
  latestPost: 420,
  aboutMe: 220,
  friendSpace: 220,
  verse: 240,
  wall: 420,
};

const DEFAULT_LAYOUT: ProfilePanelLayoutItem[] = [
  { i: "photo", x: 0, y: 0, w: 6, h: 9 },
  { i: "latestPost", x: 6, y: 0, w: 6, h: 9 },
  // h:3 (~122px total) left only ~2 short lines of actual text after the title
  // row and panel padding — a normal-length bio clipped at the panel's own edge.
  { i: "aboutMe", x: 0, y: 9, w: 6, h: 5 },
  { i: "friendSpace", x: 6, y: 9, w: 6, h: 5 },
  // h:4 wasn't enough room for a realistic multi-line verse + reference at a
  // narrow panel width — the overflow ate into the bottom padding instead of
  // being reachable by scroll, since it landed exactly at the panel's own edge.
  { i: "verse", x: 0, y: 14, w: 12, h: 6 },
  { i: "wall", x: 0, y: 20, w: 12, h: 10 },
  // "footer" (the profile-link bar) is deliberately not here — it isn't part of
  // the draggable grid at all, so it can't be moved or resized, and always
  // renders last. See its own render below, after </ReactGridLayout>.
];

// A layout saved before the "contact" panel was replaced by "wall" and "footer" is
// missing entries for the new panels (they'd render as tiny, oddly-placed default
// boxes) and carries a dead "contact" entry no panel matches anymore. Drop unknown
// entries and append defaults for any current panel the saved layout doesn't cover,
// stacked below everything else so they can't collide with the kept positions.
function resolveLayout(saved: ProfilePanelLayoutItem[] | null): ProfilePanelLayoutItem[] {
  if (!saved) return DEFAULT_LAYOUT;
  const validIds = new Set(DEFAULT_LAYOUT.map((item) => item.i));
  const kept = saved.filter((item) => validIds.has(item.i));
  const presentIds = new Set(kept.map((item) => item.i));
  const missing = DEFAULT_LAYOUT.filter((item) => !presentIds.has(item.i));
  if (missing.length === 0) return kept;
  let nextY = kept.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  const appended = missing.map((item) => {
    const positioned = { ...item, y: nextY };
    nextY += item.h;
    return positioned;
  });
  return [...kept, ...appended];
}

function PanelEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Edit panel"
      className="shrink-0 rounded-full px-2 py-0.5 text-xs opacity-60 hover:opacity-100"
    >
      Edit
    </button>
  );
}

export function ProfileScreen({
  viewer,
  target,
  isSelf,
  topFriends,
  wallComments,
  myFriends,
  friendCount,
  friendStatus,
  familyStatus,
  latestPost,
  likeCount,
  viewerCount,
  totalViewCount,
  initiallyLiked,
  unreadNotificationCount,
}: {
  viewer: Profile | null;
  target: Profile;
  isSelf: boolean;
  topFriends: TopFriendWithProfile[];
  wallComments: ProfileCommentWithAuthor[];
  myFriends: FriendshipWithProfile[];
  friendCount: number;
  friendStatus: FriendshipStatus;
  familyStatus: FamilyConnectionStatus;
  latestPost: PostWithAuthor | null;
  likeCount: number;
  viewerCount: number;
  totalViewCount: number;
  initiallyLiked: boolean;
  unreadNotificationCount: number;
}) {
  const theme = resolveTheme(target.theme);
  const pageStyle: React.CSSProperties = theme.pageBackground
    ? theme.pageBackgroundImage
      ? { backgroundImage: `url(${theme.pageBackgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { backgroundColor: theme.pageBackground }
    : {};
  const navbarBg = theme.navbarBackground;
  const navbarIcon = theme.navbarIconColor;

  const router = useRouter();
  const { width, containerRef, mounted } = useContainerWidth();
  const [editingLayout, setEditingLayout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<ProfilePanelId | null>(null);
  const [editingPageBackground, setEditingPageBackground] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [vouchGateOpen, setVouchGateOpen] = useState(false);
  const [layout, setLayout] = useState<ProfilePanelLayoutItem[]>(() => resolveLayout(target.layout));
  const [savingLayout, setSavingLayout] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  // Only one of the panel-edit modals is ever open at a time, so one shared flag
  // is enough — each form reports its own dirty state as it mounts/changes.
  const [panelDirty, setPanelDirty] = useState(false);
  const [pageBackgroundDirty, setPageBackgroundDirty] = useState(false);

  function confirmDiscard(dirty: boolean) {
    return !dirty || window.confirm("Discard unsaved changes?");
  }

  async function handleSaveLayout() {
    if (!viewer) return;
    setSavingLayout(true);
    try {
      await updateProfile(createClient(), viewer.id, { layout });
      setEditingLayout(false);
    } finally {
      setSavingLayout(false);
    }
  }

  function handleCancelLayout() {
    setLayout(resolveLayout(target.layout));
    setEditingLayout(false);
  }

  function handleResetLayout() {
    setLayout(DEFAULT_LAYOUT);
  }

  async function handleResetAll() {
    if (!viewer) return;
    const confirmed = window.confirm(
      "Reset all profile customization — colors, panel layout, and info panel style — back to default? This can't be undone."
    );
    if (!confirmed) return;

    setResettingAll(true);
    try {
      await updateProfile(createClient(), viewer.id, { theme: null, layout: null, photo_settings: null });
      setLayout(DEFAULT_LAYOUT);
      setMenuOpen(false);
      router.refresh();
    } finally {
      setResettingAll(false);
    }
  }

  function editAction(panelId: ProfilePanelId) {
    return isSelf && !editingLayout ? <PanelEditButton onClick={() => setEditingPanel(panelId)} /> : undefined;
  }

  // ActionSlot's caller (this component) always has a non-null viewer by the time
  // this can fire (it renders nothing otherwise) — the only remaining gate is
  // status, e.g. liking someone else's profile as a still-pending guest.
  function requireAuth(action: () => void) {
    if (viewer && viewer.status !== "active") {
      setVouchGateOpen(true);
      return;
    }
    action();
  }

  // Same title-row corner the self-view Edit button uses — mutually exclusive with
  // it, since this only ever shows for an admin viewing someone else's profile.
  const photoAction = isSelf ? editAction("photo") : viewer?.role === "admin" ? <AdminMemberActions target={target} /> : undefined;

  const photoSettings = resolvePhotoSettings(target.photo_settings);
  const photoStyle = resolvePanelStyle(theme, "photo");
  const latestPostStyle = resolvePanelStyle(theme, "latestPost");
  const wallStyle = resolvePanelStyle(theme, "wall");
  const footerStyle = resolvePanelStyle(theme, "footer");
  const aboutMeStyle = resolvePanelStyle(theme, "aboutMe");
  const friendSpaceStyle = resolvePanelStyle(theme, "friendSpace");
  const verseStyle = resolvePanelStyle(theme, "verse");

  const panels: Record<string, React.ReactNode> = {
    photo: (
      <Panel style={photoStyle} title={target.display_name || `@${target.username}`} action={photoAction}>
        <PhotoPanelContent
          target={target}
          viewer={viewer}
          isSelf={isSelf}
          style={photoStyle}
          photoSettings={photoSettings}
          likeCount={likeCount}
          viewerCount={viewerCount}
          totalViewCount={totalViewCount}
          initiallyLiked={initiallyLiked}
          friendStatus={friendStatus}
          familyStatus={familyStatus}
          requireAuth={requireAuth}
        />
      </Panel>
    ),
    latestPost: (
      <Panel style={latestPostStyle} title="Latest Post" action={editAction("latestPost")}>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1 overflow-hidden">
            {latestPost ? (
              <LatestPostPreview post={latestPost} />
            ) : (
              <p className="text-sm opacity-70">No posts yet.</p>
            )}
          </div>
          {isSelf && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className={
                latestPostStyle
                  ? "self-start rounded-xl border px-4 py-1.5 text-sm hover:opacity-80"
                  : "self-start rounded-xl border border-card-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
              }
              style={latestPostStyle ? { borderColor: latestPostStyle.border } : undefined}
            >
              {latestPost ? "Post something new" : "Add a post"}
            </button>
          )}
        </div>
      </Panel>
    ),
    wall: (
      <Panel style={wallStyle} title="Wall" action={editAction("wall")}>
        <ProfileWall profileId={target.id} isOwner={isSelf} viewer={viewer} initialComments={wallComments} textSize={wallStyle?.textSize} />
      </Panel>
    ),
    aboutMe: (
      <Panel style={aboutMeStyle} title="About Me" action={editAction("aboutMe")}>
        <p
          className={aboutMeStyle ? "whitespace-pre-wrap" : "whitespace-pre-wrap font-serif text-sm"}
          style={aboutMeStyle ? { fontSize: aboutMeStyle.textSize } : undefined}
        >
          {target.about_me || "Nothing here yet."}
        </p>
      </Panel>
    ),
    friendSpace: (
      <Panel style={friendSpaceStyle} title={`Fellowship (${friendCount})`} action={editAction("friendSpace")}>
        {topFriends.length === 0 ? (
          <p className="text-sm opacity-70">No top friends yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {topFriends.map((tf) => (
              <li key={tf.friend_id}>
                <Link href={`/profile/${tf.profile.username}`} className="flex w-20 flex-col items-center gap-1">
                  <Avatar url={tf.profile.avatar_url} username={tf.profile.username} size={56} />
                  <span
                    className={friendSpaceStyle ? "w-full truncate text-center opacity-80" : "w-full truncate text-center text-xs opacity-80"}
                    style={friendSpaceStyle ? { fontSize: friendSpaceStyle.textSize } : undefined}
                  >
                    @{tf.profile.username}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    ),
    verse: (
      <Panel style={verseStyle} title="Favorite Verse" action={editAction("verse")}>
        {target.favorite_verse ? (
          // min-h-0 matters here: a flex item's default `min-height: auto` refuses
          // to shrink below its own content's natural size, so without it a longer
          // verse (wrapped across several lines at a narrow width) blocks this
          // div from shrinking to fit next to the title row — the overflow can't
          // resolve within the flex layout, and ends up eating into the panel's
          // own bottom padding instead of being handled by the content div's
          // overflow-y-auto the way it should. justify-center-safe on top so a
          // verse that still doesn't fit falls back to top-aligned rather than
          // centering symmetrically past both edges of the box.
          <div className="flex h-full min-h-0 flex-col justify-center-safe gap-2">
            <blockquote
              className={verseStyle ? "italic" : "italic font-serif text-sm"}
              style={verseStyle ? { fontSize: verseStyle.textSize } : undefined}
            >
              &ldquo;{target.favorite_verse.text}&rdquo;
            </blockquote>
            <p className="text-xs opacity-60">
              — {target.favorite_verse.reference} ({target.favorite_verse.translation.toUpperCase()})
            </p>
          </div>
        ) : (
          <p className="text-sm opacity-70">{isSelf ? "Add a favorite verse to share here." : "No favorite verse yet."}</p>
        )}
      </Panel>
    ),
  };

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-20 grid grid-cols-3 items-center px-4 py-3 sm:px-8 ${navbarBg ? "shadow-md" : "border-b border-card-border bg-background"}`}
        style={navbarBg ? { backgroundColor: navbarBg } : undefined}
      >
        <Link
          href="/"
          className={`justify-self-start text-sm hover:opacity-80 ${navbarIcon ? "" : "text-muted"}`}
          style={navbarIcon ? { color: navbarIcon } : undefined}
        >
          Back
        </Link>

        <span
          className={`justify-self-center text-lg font-bold ${navbarIcon ? "" : "text-foreground"}`}
          style={navbarIcon ? { color: navbarIcon } : undefined}
        >
          Koino
        </span>

        <div className="flex items-center gap-2 justify-self-end">
          {viewer && !editingLayout && (
            <NotificationBell profile={viewer} initialUnreadCount={unreadNotificationCount} bordered iconColor={navbarIcon} />
          )}
          {isSelf &&
            (editingLayout ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className={`rounded-xl border px-3 py-1.5 text-sm hover:opacity-80 ${navbarIcon ? "" : "border-card-border text-muted"}`}
                  style={navbarIcon ? { borderColor: navbarIcon, color: navbarIcon } : undefined}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleCancelLayout}
                  className={`rounded-xl border px-3 py-1.5 text-sm hover:opacity-80 ${navbarIcon ? "" : "border-card-border text-muted"}`}
                  style={navbarIcon ? { borderColor: navbarIcon, color: navbarIcon } : undefined}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingLayout}
                  onClick={handleSaveLayout}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${navbarIcon ? "" : "bg-olive-dark text-white"}`}
                  style={navbarIcon ? { backgroundColor: navbarIcon, color: navbarBg ?? DEFAULT_NAVBAR_BACKGROUND } : undefined}
                >
                  {savingLayout ? "Saving…" : "Save layout"}
                </button>
              </div>
            ) : (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Profile options"
                  className={`flex h-9 w-9 items-center justify-center rounded-full border hover:opacity-80 ${navbarIcon ? "" : "border-card-border text-muted"}`}
                  style={navbarIcon ? { borderColor: navbarIcon, color: navbarIcon } : undefined}
                >
                  ⋯
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-card-border bg-card shadow-lg">
                      {/* Position/size is fixed on mobile (see MOBILE_BREAKPOINT above) —
                          nothing to rearrange there, so this only makes sense at desktop width. */}
                      {width >= MOBILE_BREAKPOINT && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLayout(true);
                            setMenuOpen(false);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-input"
                        >
                          Rearrange panels
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPageBackground(true);
                          setMenuOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-input"
                      >
                        Page background
                      </button>
                      <button
                        type="button"
                        disabled={resettingAll}
                        onClick={handleResetAll}
                        className="block w-full border-t border-card-border px-4 py-2 text-left text-sm text-danger hover:bg-input disabled:opacity-50"
                      >
                        {resettingAll ? "Resetting…" : "Reset to default"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      <main className="flex-1 p-4 pt-20 sm:p-8 sm:pt-24" style={pageStyle}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          {editingLayout && (
            <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm text-foreground">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-gold">
                <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45 1 1.15 1 1.9v.2h5v-.2c0-.75.4-1.45 1-1.9A6 6 0 0 0 12 3z" strokeLinejoin="round" />
                <path d="M10 19h4M10.5 21h3" strokeLinecap="round" />
              </svg>
              <p>
                <span className="font-medium">Move</span> a panel by dragging its title bar. <span className="font-medium">Resize</span> it by
                dragging its bottom-right corner. When you&rsquo;re happy, hit <span className="font-medium">Save layout</span> — or{" "}
                <span className="font-medium">Cancel</span> to discard your changes.
              </p>
            </div>
          )}

          <div ref={containerRef}>
            {mounted &&
              (width < MOBILE_BREAKPOINT ? (
                <div className="flex flex-col gap-4">
                  {MOBILE_PANEL_ORDER.map((id) => (
                    <div key={id} style={{ height: MOBILE_PANEL_HEIGHT[id] }}>
                      {panels[id]}
                    </div>
                  ))}
                </div>
              ) : (
                <ReactGridLayout
                  width={width}
                  layout={layout as Layout}
                  gridConfig={{ cols: 12, rowHeight: 30, margin: [16, 16] }}
                  dragConfig={{ enabled: editingLayout, handle: ".panel-drag-handle" }}
                  resizeConfig={{ enabled: editingLayout }}
                  onLayoutChange={(next) => setLayout(next as ProfilePanelLayoutItem[])}
                >
                  {Object.keys(panels).map((id) => (
                    <div key={id}>{panels[id]}</div>
                  ))}
                </ReactGridLayout>
              ))}
          </div>

          {/* Deliberately outside the grid (see DEFAULT_LAYOUT above): a react-grid-layout
              item's `isDraggable`/`isResizable: false` only opts it out of user interaction,
              it doesn't guarantee last position if other panels get dragged past it. Rendering
              it here, after the grid, is what actually makes "always at the bottom" true. */}
          <div className="h-16">
            <Panel style={footerStyle} title="Profile Link" action={editAction("footer")} inline hideTitle>
              <span className={footerStyle ? "" : "text-sm"} style={{ opacity: 0.7, ...(footerStyle ? { fontSize: footerStyle.textSize } : {}) }}>
                koino.app/profile/{target.username}
              </span>
            </Panel>
          </div>
        </div>
      </main>

      {isSelf && viewer && (
        <>
          <Modal
            open={editingPanel === "photo"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-2xl"
          >
            <PhotoEditForm profile={target} onSaved={() => setEditingPanel(null)} onDirtyChange={setPanelDirty} />
          </Modal>
          <Modal
            open={editingPanel === "aboutMe"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-lg"
          >
            <AboutMeEditForm profile={target} onSaved={() => setEditingPanel(null)} onDirtyChange={setPanelDirty} />
          </Modal>
          <Modal
            open={editingPanel === "friendSpace"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-lg"
          >
            <FriendSpaceEditForm
              profile={target}
              topFriends={topFriends}
              myFriends={myFriends}
              onSaved={() => setEditingPanel(null)}
              onDirtyChange={setPanelDirty}
            />
          </Modal>
          <Modal
            open={editingPanel === "latestPost"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-lg"
          >
            <PanelOnlyEditForm
              profile={target}
              panelId="latestPost"
              title="Latest Post"
              onSaved={() => setEditingPanel(null)}
              onDirtyChange={setPanelDirty}
            />
          </Modal>
          <Modal
            open={editingPanel === "wall"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-lg"
          >
            <PanelOnlyEditForm profile={target} panelId="wall" title="Wall" onSaved={() => setEditingPanel(null)} onDirtyChange={setPanelDirty} />
          </Modal>
          <Modal
            open={editingPanel === "footer"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-lg"
          >
            <PanelOnlyEditForm
              profile={target}
              panelId="footer"
              title="Profile Link"
              onSaved={() => setEditingPanel(null)}
              onDirtyChange={setPanelDirty}
            />
          </Modal>
          <Modal
            open={editingPanel === "verse"}
            onClose={() => setEditingPanel(null)}
            confirmClose={() => confirmDiscard(panelDirty)}
            widthClassName="max-w-lg"
          >
            <VerseEditForm profile={target} onSaved={() => setEditingPanel(null)} onDirtyChange={setPanelDirty} />
          </Modal>
          <Modal
            open={editingPageBackground}
            onClose={() => setEditingPageBackground(false)}
            confirmClose={() => confirmDiscard(pageBackgroundDirty)}
            widthClassName="max-w-lg"
          >
            <PageBackgroundForm profile={target} onSaved={() => setEditingPageBackground(false)} onDirtyChange={setPageBackgroundDirty} />
          </Modal>
          <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} authorId={viewer.id} />
        </>
      )}
      {viewer && <VouchGateModal open={vouchGateOpen} onClose={() => setVouchGateOpen(false)} guestId={viewer.id} />}
    </>
  );
}