import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
