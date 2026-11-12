"use client";

import { useEffect, useRef, useState } from "react";

/** The body of a text-only post. It fills whatever height the card gives it;
 * if the text is taller than that, it's cut at the card's edge with a "See
 * more" that lets it scroll inside the card — the card itself never grows,
 * so a long post can't spill into the next one in the feed. */
export function PostTextBody({
  text,
  light,
  className,
  style,
}: {
  text: string;
  light: boolean;
  className: string;
  style?: React.CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  function toggle() {
    setExpanded((v) => {
      if (v && boxRef.current) boxRef.current.scrollTop = 0;
      return !v;
    });
  }

  return (
    <div data-post-text-body className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* my-auto on the paragraph (not items-center on the box) centers short
          text but keeps the top of long text reachable once it overflows —
          items-center would push the start of a long post above the fold. */}
      <div ref={boxRef} className={`flex min-h-0 flex-1 flex-col ${expanded ? "overflow-y-auto" : "overflow-hidden"}`}>
        <p className={`my-auto ${className}`} style={style}>
          {text}
        </p>
      </div>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={toggle}
          className={`mt-2 shrink-0 self-start text-sm font-medium ${
            light ? "text-white/80 hover:text-white" : "text-olive-dark hover:underline"
          }`}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
