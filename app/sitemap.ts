import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/brand';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/auth/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/auth/login`, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
