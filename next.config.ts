import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Native packages must run in Node.js runtime (not edge/browser)
  serverExternalPackages: ["@napi-rs/canvas", "bwip-js"],

  // Allow serving images from public/backgrounds and public/output
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
