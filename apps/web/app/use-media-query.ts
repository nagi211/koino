"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe viewport check — the server has no window, so the server
 * snapshot (and therefore the client's first paint, which has to match it)
 * is always false; the real value takes over right after mount. Same
 * useSyncExternalStore approach as useMounted, for the same reason: a
 * useEffect+setState version would be an extra render for no real benefit
 * *and* still race the first paint against whatever the actual viewport is.
 */
export function useMediaQuery(query: string): boolean {
  function subscribe(callback: () => void) {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }
  function getSnapshot() {
    return window.matchMedia(query).matches;
  }
  function getServerSnapshot() {
    return false;
  }
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
