import 'server-only';

import { cacheLife } from 'next/cache';

export type LiveRoute = {
  id: string;
  name: string;
  price: number;
  /** null = capacity not tracked for this route. */
  seatsLeft: number | null;
};

export type LandingData = {
  routes: LiveRoute[];
  routesAvailable: boolean;
  pickupZones: string[];
  institutions: string[];
};

// Shown when the database is unreachable or a table is still empty.
const FALLBACK_PICKUP_ZONES = [
  'Hassan Abdal',
  'Wah Cantt (Br 1–3)',
  'Gudwal / 26 Area',
  'Kohistan Enclave',
  'Wah Model Town',
  'New City Phase II',
  'GT Road / Taxila',
  'B-17 MultiGardens',
  'D-17 Society',
  'E-16 / Tarnol / G-15',
];

const FALLBACK_INSTITUTIONS = [
  'Air University',
  'Bahria University',
  'NUST',
  'FAST-NUCES',
  'National Defence University',
];

async function rest<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Public, aggregate-only data for the landing page. Never personal data. */
export async function getLandingData(): Promise<LandingData> {
  'use cache';
  cacheLife('minutes');

  const [routes, availability, zones, groups] = await Promise.all([
    rest<{ id: string; name: string; price: number }[]>(
      'routes?select=id,name,price&order=price.asc,name.asc',
    ),
    rest<{ route_id: string; seats_left: number | null }[]>(
      'rpc/route_availability',
      { method: 'POST', body: '{}' },
    ),
    rest<{ name: string }[]>(
      'pickup_zones?select=name&active=eq.true&order=sort_order.asc,name.asc',
    ),
    rest<{ university: string }[]>(
      'departure_groups?select=university&active=eq.true&order=university.asc',
    ),
  ]);

  const seatsByRoute = new Map(
    (Array.isArray(availability) ? availability : []).map((row) => [
      row.route_id,
      row.seats_left,
    ]),
  );

  const institutions = Array.isArray(groups)
    ? [...new Set(groups.map((g) => g.university.trim()).filter(Boolean))]
    : [];
  const pickupZones = Array.isArray(zones)
    ? zones.map((z) => z.name.trim()).filter(Boolean)
    : [];

  return {
    routesAvailable: Array.isArray(routes),
    routes: (Array.isArray(routes) ? routes : []).map((route) => ({
      id: route.id,
      name: route.name,
      price: Number(route.price) || 0,
      seatsLeft: seatsByRoute.get(route.id) ?? null,
    })),
    pickupZones: pickupZones.length ? pickupZones : FALLBACK_PICKUP_ZONES,
    institutions: institutions.length ? institutions : FALLBACK_INSTITUTIONS,
  };
}
