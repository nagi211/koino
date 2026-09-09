"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateProfileSchema } from "@koino/core";
import type { FavoriteVerse, Profile, ProfileTheme } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { BIBLE_BOOKS, BIBLE_TRANSLATIONS, fetchBibleVerse } from "./bible-verse";
import { PanelStyleEditor } from "./panel-style-editor";
import { resolvePanelStyle, resolveTheme, withUpdatedPanelStyle } from "./theme";

export function VerseEditForm({
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
  const [reference, setReference] = useState(profile.favorite_verse?.reference ?? "");
  const [translation, setTranslation] = useState(profile.favorite_verse?.translation ?? BIBLE_TRANSLATIONS[0].id);
  const [verse, setVerse] = useState<FavoriteVerse | null>(profile.favorite_verse);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ProfileTheme>(resolveTheme(profile.theme));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resettingPanel, setResettingPanel] = useState(false);
  // Tracks the last-saved value (not just the initial one) so a successful save
  // or instant reset can move the baseline forward — otherwise isDirty would
  // stay stuck true after those, incorrectly prompting to discard changes that
  // are already saved.
  const [savedState, setSavedState] = useState({ verse, theme });
  const isDirty = JSON.stringify({ verse, theme }) !== JSON.stringify(savedState);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const panelStyle = resolvePanelStyle(theme, "verse");

  async function handleSearch() {
    setSearchError(null);
    setSearching(true);
    try {
      const result = await fetchBibleVerse(reference, translation);
      setVerse(result);
      setReference(result.reference);
    } catch (err) {
      setVerse(null);
      setSearchError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSearching(false);
    }
  }

  function handlePickBook(book: string) {
    // Prefill (don't overwrite an in-progress chapter:verse the user already typed
    // for a *different* book) — starting fresh is the common case.
    setReference(`${book} `);
  }

  async function handleResetPanelStyleNow() {
    if (!window.confirm("Reset this panel's background, border, and colors back to default?")) return;
    setResettingPanel(true);
    try {
      const resetTheme = withUpdatedPanelStyle(theme, "verse", null);
      setTheme(resetTheme);
      await updateProfile(createClient(), profile.id, { theme: resetTheme });
      setSavedState((prev) => ({ ...prev, theme: resetTheme }));
      router.refresh();
    } finally {
      setResettingPanel(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = updateProfileSchema.safeParse({ favorite_verse: verse, theme });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join(".");
      setError(issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid input");
      return;
    }

    setPending(true);
    try {
      await updateProfile(createClient(), profile.id, parsed.data);
      setSavedState({ verse, theme });
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Edit Favorite Verse</h2>

      <div className="flex flex-col gap-3 rounded-xl border border-card-border p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="verse-book">
            Book
          </label>
          <select
            id="verse-book"
            className={inputClasses}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handlePickBook(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Jump to a book…
            </option>
            {BIBLE_BOOKS.map((book) => (
              <option key={book} value={book}>
                {book}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="verse-reference">
            Reference
          </label>
          <div className="flex gap-2">
            <input
              id="verse-reference"
              className={`flex-1 ${inputClasses}`}
              placeholder="John 3:16"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !reference.trim()}
              className="shrink-0 rounded-xl bg-olive-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          <p className="text-xs text-muted">Type a reference like &ldquo;John 3:16&rdquo; or &ldquo;Romans 8:38-39&rdquo;, then search.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted" htmlFor="verse-translation">
            Translation
          </label>
          <select
            id="verse-translation"
            className={inputClasses}
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
          >
            {BIBLE_TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {searchError && <p className="text-sm text-danger">{searchError}</p>}

        {verse && (
          <div className="flex flex-col gap-2 rounded-xl border border-card-border bg-input p-4">
            <blockquote className="text-sm italic text-foreground">&ldquo;{verse.text}&rdquo;</blockquote>
            <p className="text-xs text-muted">
              — {verse.reference} ({verse.translation.toUpperCase()})
            </p>
            <button
              type="button"
              onClick={() => setVerse(null)}
              className="self-start text-xs text-danger hover:underline"
            >
              Remove verse
            </button>
          </div>
        )}
      </div>

      <PanelStyleEditor
        profileId={profile.id}
        panelId="verse"
        style={panelStyle}
        onChange={(next) => setTheme((prev) => withUpdatedPanelStyle(prev, "verse", next))}
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
