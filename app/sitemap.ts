import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/brand';
import { slugify } from '@/lib/public/institutions';
import { getLandingData } from '@/lib/public/landing-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { institutions } = await getLandingData();
  return [
    ...institutions.map((name) => ({
      url: `${base}/campus/${slugify(name)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/auth/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/auth/login`, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
