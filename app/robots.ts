/**
 * @file robots.txt — disallow `/me/*`, `/admin/*`, `/api/*`, `/out/*`.
 */

import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const env = getEnv();
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/me/", "/admin/", "/api/", "/out/", "/login"] },
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
