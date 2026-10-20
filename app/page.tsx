import { cacheLife } from 'next/cache';
import LandingPage, { type LiveRoute } from './landing-page';

async function getRoutes(): Promise<LiveRoute[]> {
  'use cache';
  cacheLife('minutes');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const res = await fetch(
      `${url}/rest/v1/routes?select=id,name,price&order=name`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as LiveRoute[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialRoutes = await getRoutes();
  return <LandingPage initialRoutes={initialRoutes} />;
}
