/**
 * @file Next.js configuration.
 *
 * Keeps the runtime configuration minimal: strict React, image domain
 * allowlist, and structured-logging-friendly output. Tweak only when a
 * specific feature requires it.
 */

import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.gravatar.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "icons.duckduckgo.com" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
};

export default config;
