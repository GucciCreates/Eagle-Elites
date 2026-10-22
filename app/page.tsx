import { cacheLife } from 'next/cache';
import LandingPage, { type LiveRoute } from '@/components/marketing/landing-page';

async function getRoutes(): Promise<{ routes: LiveRoute[]; available: boolean }> {
  'use cache';
  cacheLife('minutes');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { routes: [], available: false };

  try {
    const res = await fetch(
      `${url}/rest/v1/routes?select=id,name,price&order=name`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return { routes: [], available: false };
    const data = (await res.json()) as LiveRoute[];
    return { routes: Array.isArray(data) ? data : [], available: true };
  } catch {
    return { routes: [], available: false };
  }
}

export default async function Page() {
  const { routes, available } = await getRoutes();
  return <LandingPage initialRoutes={routes} routesAvailable={available} />;
}
