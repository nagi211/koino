"use client";

import { useEffect, useState } from "react";
import { getUnreadMessageCount, subscribeToNotifications } from "@koino/core";
import type { Profile } from "@koino/core";
import { createClient } from "@/lib/supabase/client";

// Stays in sync live the same way NotificationBell does (a realtime
// subscription re-fetching the count on any change), but the actual "mark
// read" moment is different: there's no dropdown to open here, visiting
// /messages itself is what clears it (see messages/page.tsx), so a fresh
// initialCount arrives naturally on the next mount after that visit —
// nothing client-side needs to reset this count directly.
export function useUnreadMessageCount(profile: Profile, initialCount: number): number {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    return subscribeToNotifications(createClient(), profile.id, () => {
      getUnreadMessageCount(createClient(), profile.id).then(setCount);
    });
  }, [profile.id]);

  return count;
}
