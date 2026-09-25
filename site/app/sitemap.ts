import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://omnipulseid.vercel.app";
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/how-it-works`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/progress`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/licensing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/tiers/enterprise`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/tiers/phase-1-dsp`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/tiers/phase-2-vector`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/tiers/phase-3-agent`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
