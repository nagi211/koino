"use client";

import { useState } from "react";

/** Clamped to a few lines by default so a long caption can never push on the
 * media above it — "See more" expands into its own small scrollable box
 * instead of growing the card, so the caption's footprint stays bounded
 * either way. */
export function PostCaption({ text, light }: { text: string; light: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const textClass = light ? "text-white" : "text-foreground";
  const linkClass = light ? "text-white/80 hover:text-white" : "text-olive-dark hover:underline";

  return (
    <div className="mt-4 shrink-0">
      <p className={`whitespace-pre-wrap font-serif text-lg ${textClass} ${expanded ? "max-h-40 overflow-y-auto" : "line-clamp-3"}`}>
        {text}
      </p>
      {!expanded && text.length > 160 && (
        <button type="button" onClick={() => setExpanded(true)} className={`mt-1 text-sm font-medium ${linkClass}`}>
          See more
        </button>
      )}
      {expanded && (
        <button type="button" onClick={() => setExpanded(false)} className={`mt-1 text-sm font-medium ${linkClass}`}>
          See less
        </button>
      )}
    </div>
  );
}
