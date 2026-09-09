import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@koino/core"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
