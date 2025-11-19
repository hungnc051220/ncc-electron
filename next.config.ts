import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    unoptimized: true,
  },
  distDir: ".next",
};

export default nextConfig;
