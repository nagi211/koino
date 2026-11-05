"use client";

import { useRef, useState } from "react";
import Image from "next/image";

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

/** A swipeable, snap-scrolling row of photos — native touch/trackpad swipe
 * does the heavy lifting, the arrow buttons and dots are a pointer-friendly
 * alternative on top of the same scroll container. Tapping any photo opens
 * it full-screen in a lightbox, starting on whichever one was tapped. */
export function PhotoCarousel({ urls }: { urls: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function goTo(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(urls.length - 1, next));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  function openLightbox(i: number) {
    setLightboxIndex(i);
    setLightboxOpen(true);
  }

  return (
    <>
      <div className="relative h-full w-full">
        {urls.length === 1 ? (
          <button type="button" onClick={() => openLightbox(0)} className="relative h-full w-full cursor-zoom-in">
            <Image src={urls[0]} alt="" fill className="object-cover" />
          </button>
        ) : (
          <>
            <div
              ref={trackRef}
              onScroll={handleScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
            >
              {urls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => openLightbox(i)}
                  className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
                >
                  <Image src={url} alt="" fill className="object-cover" priority={i === 0} />
                </button>
              ))}
            </div>
            <Arrows index={index} count={urls.length} onPrev={() => goTo(index - 1)} onNext={() => goTo(index + 1)} />
            <Dots count={urls.length} index={index} />
            <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
              {index + 1}/{urls.length}
            </span>
          </>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-6 top-6 text-2xl text-white"
          >
            ✕
          </button>
          <div className="relative h-[85vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Image src={urls[lightboxIndex]} alt="" fill className="object-contain" />
            {urls.length > 1 && (
              <>
                <Arrows
                  index={lightboxIndex}
                  count={urls.length}
                  onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
                  onNext={() => setLightboxIndex((i) => Math.min(urls.length - 1, i + 1))}
                />
                <Dots count={urls.length} index={lightboxIndex} />
                <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                  {lightboxIndex + 1}/{urls.length}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
