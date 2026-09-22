"use client";

import { formatPostDate } from "./format-date";
import { useMounted } from "./use-mounted";

/**
 * formatPostDate depends on the runtime's local timezone/locale (via
 * toLocaleTimeString/toLocaleDateString) — a server render (Vercel's function,
 * often UTC) and a visitor's browser (their own timezone) can format the same
 * instant as different text, which React treats as a hydration mismatch (and,
 * worse, can leave nearby event handlers — like this card's own links —
 * unattached). Rendering nothing until mounted guarantees the server and the
 * first client render agree (both render nothing), then swaps in the real,
 * locale-correct text a moment later.
 */
export function PostDate({ iso }: { iso: string }) {
  const mounted = useMounted();

  if (!mounted) return null;
  return <span title={new Date(iso).toLocaleString()}>{formatPostDate(iso)}</span>;
}
