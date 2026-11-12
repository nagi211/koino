"use client";

import { useEffect, useRef, useState } from "react";

/** A caption that can never push on the media above it. In a post card it
 * occupies a fixed-height slot whether collapsed (3 lines) or expanded — the
 * expanded text scrolls inside that same slot, so toggling "See more" never
 * changes the photo/video size. The lightbox variant sizes to its content up
 * to a cap instead, since there's nothing above it competing for room. */
export function PostCaption({ text, variant = "card" }: { text: string; variant?: "card" | "lightbox" }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const light = variant === "lightbox";

  // Measure instead of guessing by character count — whether 3 lines is
  // enough depends on the card's width, line breaks, and font, not length.
  useEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  const textClass = light ? "text-white" : "text-foreground";
  const linkClass = light ? "text-white/70 hover:text-white" : "text-olive-dark hover:underline";
  const slotClass = variant === "card" ? "mt-4 h-28" : "max-h-40";

  return (
    <div data-post-caption className={`flex shrink-0 flex-col ${slotClass}`}>
      <p
        ref={textRef}
        className={`whitespace-pre-wrap break-words font-serif text-lg ${textClass} ${
          expanded ? "min-h-0 flex-1 overflow-y-auto" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`mt-1 shrink-0 self-start text-sm font-medium ${linkClass}`}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
