import type { PostBackground } from "@koino/core";

export const BACKGROUND_STYLES: Record<PostBackground, { gradient: string }> = {
  sunrise: { gradient: "from-orange-300 to-pink-400" },
  ocean: { gradient: "from-sky-400 to-blue-600" },
  meadow: { gradient: "from-lime-300 to-emerald-500" },
  berry: { gradient: "from-fuchsia-400 to-purple-600" },
  dusk: { gradient: "from-indigo-400 to-slate-700" },
};
