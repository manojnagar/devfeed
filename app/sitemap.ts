/**
 * @file Dynamic sitemap.xml.
 *
 * Includes the home page, every public publisher, and every public tag
 * page. We intentionally omit `/me`, `/admin`, and `/api` routes.
 */

import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";
import { getRepository } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const env = getEnv();
  const repo = getRepository();
  const [publishers, tags] = await Promise.all([
    repo.publishers.list({ isActive: true }),
    repo.tags.list(),
  ]);
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();

  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1, lastModified: now },
    { url: `${base}/publishers`, changeFrequency: "daily", priority: 0.6, lastModified: now },
    { url: `${base}/tags`, changeFrequency: "weekly", priority: 0.5, lastModified: now },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3, lastModified: now },
    ...publishers.map((p) => ({
      url: `${base}/publishers/${p.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
      lastModified: new Date(p.updatedAt),
    })),
    ...tags.map((t) => ({
      url: `${base}/tags/${t.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
      lastModified: now,
    })),
  ];
}
