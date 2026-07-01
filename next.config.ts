import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable strict mode for better development
  reactStrictMode: true,

  // Native packages must run in Node.js runtime (not edge/browser)
  serverExternalPackages: ["@napi-rs/canvas", "bwip-js"],

  // Allow serving images from public/backgrounds and public/output
  images: {
    unoptimized: true,
  },

  // Vercel: exclude native modules from file tracing
  experimental: {
    turbopack: undefined,
  },
};

export default nextConfig;
