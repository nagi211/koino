"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PostCaption } from "./post-caption";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrows({ index, count, onPrev, onNext }: { index: number; count: number; onPrev: () => void; onNext: () => void }) {
  return (
    <>
      {index > 0 && (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      {index < count - 1 && (
        <button
          type="button"
          onClick={onNext}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
    </>
  );
}

function Dots({ count, index }: { count: number; index: number }) {
  return (
    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`} />
      ))}
    </div>
  );
}

/** Horizontal snap-scroll track shared by the inline carousel and the
 * lightbox — native touch/trackpad swipe does the heavy lifting; the arrows
 * and dots are a pointer-friendly alternative driving the same scroller. */
function useTrack(ref: React.RefObject<HTMLDivElement | null>, count: number) {
  const [index, setIndex] = useState(0);

  function goTo(next: number, behavior: ScrollBehavior = "smooth") {
    const track = ref.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(count - 1, next));
    track.scrollTo({ left: clamped * track.clientWidth, behavior });
  }

  function onScroll() {
    const track = ref.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  return { index, setIndex, goTo, onScroll };
}

/** The photos on a post. Every photo is shown whole (letterboxed, never
 * cropped), and tapping one opens it full-screen with the caption underneath. */
export function PhotoCarousel({ urls, caption, author }: { urls: string[]; caption?: string | null; author?: string }) {
  const inlineRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const inline = useTrack(inlineRef, urls.length);
  const lightbox = useTrack(lightboxRef, urls.length);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const openAtRef = useRef(0);
  const multi = urls.length > 1;

  function openLightbox(i: number) {
    openAtRef.current = i;
    setLightboxOpen(true);
  }

  // On open: jump the lightbox track to the tapped photo (instantly, before
  // paint matters less than not animating from photo 1), and let Escape
  // close it. Keyed on open only — re-running on every index change would
  // yank the track mid-swipe.
  useEffect(() => {
    if (!lightboxOpen) return;
    lightbox.setIndex(openAtRef.current);
    lightbox.goTo(openAtRef.current, "instant");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

  return (
    <>
      <div className="relative h-full w-full bg-black">
        <div
          ref={inlineRef}
          onScroll={inline.onScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => openLightbox(i)}
              aria-label="View photo"
              className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
            >
              <Image src={url} alt="" fill className="object-contain" priority={i === 0} />
            </button>
          ))}
        </div>
        {multi && (
          <>
            <Arrows index={inline.index} count={urls.length} onPrev={() => inline.goTo(inline.index - 1)} onNext={() => inline.goTo(inline.index + 1)} />
            <Dots count={urls.length} index={inline.index} />
            <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {inline.index + 1}/{urls.length}
            </span>
          </>
        )}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          {/* Dedicated top bar — the close button lives here, outside the photo
              area entirely, so neither the image nor the counter can ever paint
              over it. */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <span className="text-sm text-white/80">{multi ? `${lightbox.index + 1}/${urls.length}` : ""}</span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20"
            >
              ✕
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={lightboxRef}
              onScroll={lightbox.onScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto"
            >
              {urls.map((url) => (
                <div key={url} className="relative h-full w-full shrink-0 snap-center">
                  <Image src={url} alt="" fill className="object-contain" />
                </div>
              ))}
            </div>
            {multi && (
              <>
                <Arrows index={lightbox.index} count={urls.length} onPrev={() => lightbox.goTo(lightbox.index - 1)} onNext={() => lightbox.goTo(lightbox.index + 1)} />
                <Dots count={urls.length} index={lightbox.index} />
              </>
            )}
          </div>

          {(author || caption) && (
            <div className="shrink-0 px-4 pb-6 pt-3">
              {author && <p className="font-semibold">@{author}</p>}
              {caption && <PostCaption text={caption} variant="lightbox" />}
            </div>
          )}
        </div>
      )}
    </>
  );
}
