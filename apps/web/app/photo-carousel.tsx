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

/** A swipeable, snap-scrolling row of photos — native touch/trackpad swipe
 * does the heavy lifting, the arrow buttons and dots are a pointer-friendly
 * alternative on top of the same scroll container. */
export function PhotoCarousel({ urls }: { urls: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

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

  if (urls.length === 1) {
    return (
      <div className="relative h-full w-full">
        <Image src={urls[0]} alt="" fill className="object-cover" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {urls.map((url, i) => (
          <div key={url} className="relative h-full w-full shrink-0 snap-center">
            <Image src={url} alt="" fill className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      {index < urls.length - 1 && (
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronIcon direction="right" />
        </button>
      )}

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {urls.map((url, i) => (
          <span key={url} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`} />
        ))}
      </div>

      <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
        {index + 1}/{urls.length}
      </span>
    </div>
  );
}
