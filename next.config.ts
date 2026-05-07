import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mute the multi-lockfile warning by pinning workspace root to this folder.
  turbopack: { root: __dirname },
};

export default nextConfig;
