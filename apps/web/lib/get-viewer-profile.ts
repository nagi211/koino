import { cache } from "react";
import { getMyProfile } from "@koino/core";
import { createClient } from "./supabase/server";

/**
 * Request-scoped memoization: a layout and the page rendering inside it often
 * both need the current profile (every /moderation/* page re-checks after
 * the layout's own auth gate) — without this, each call independently
 * triggers its own supabase.auth.getUser() network round trip for the
 * identical result within one request. React's cache() dedupes by call +
 * args for the lifetime of a single render, so every caller here shares one
 * in-flight/resolved promise instead of each paying for their own trip.
 */
export const getViewerProfile = cache(async () => {
  const supabase = await createClient();
  return getMyProfile(supabase);
});
