"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * True only once the client has taken over from the server-rendered HTML —
 * the hydration-safe way to defer rendering something that can differ between
 * server and client (e.g. locale/timezone-dependent date formatting) without
 * causing a hydration mismatch. useSyncExternalStore is React's own primitive
 * for this: its server snapshot (false) always matches the initial client
 * render, then flips to the real client snapshot (true) right after.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
