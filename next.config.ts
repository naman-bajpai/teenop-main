import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint errors during builds to allow production builds to complete
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
