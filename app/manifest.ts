import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

/** Lets riders add the portal to their home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} Rider Portal`,
    short_name: BRAND.name,
    description: 'Your trips, timetable, payments and updates with Eagle Elites.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#070b10',
    theme_color: '#070b10',
    // Placeholder mark; swap for the official logo (PNG 192 and 512) when it arrives.
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
