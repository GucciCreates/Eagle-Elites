import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/auth/login', '/auth/signup'],
      disallow: ['/admin', '/driver', '/dashboard', '/onboarding', '/api', '/auth/callback', '/auth/reset-password'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
