/**
 * @file Dynamic sitemap.xml.
 *
 * Includes the home page, every public publisher, and every public tag
 * page. We intentionally omit `/me`, `/admin`, and `/api` routes.
 *
 * Generated on first request and cached for 1 hour (`revalidate = 3600`)
 * rather than prerendered at build time. This decouples the build from
 * the database — a transient DB issue or an unfinished adapter method
 * can no longer fail the production build. If the DB call still throws
 * at runtime, we fall back to a static skeleton sitemap so search
 * engines never see a 500.
 */

import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/env";
import { getRepository } from "@/lib/data";
import { log } from "@/lib/log";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const env = getEnv();
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const skeleton: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1, lastModified: now },
    { url: `${base}/publishers`, changeFrequency: "daily", priority: 0.6, lastModified: now },
    { url: `${base}/tags`, changeFrequency: "weekly", priority: 0.5, lastModified: now },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3, lastModified: now },
  ];

  try {
    const repo = getRepository();
    const [publishers, tags] = await Promise.all([
      repo.publishers.list({ isActive: true }),
      repo.tags.list(),
    ]);
    return [
      ...skeleton,
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
  } catch (err) {
    log.error("sitemap_fallback", { error: err instanceof Error ? err.message : String(err) });
    return skeleton;
  }
}
