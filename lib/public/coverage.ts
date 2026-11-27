import type { LiveRoute, PickupStop } from './landing-data';

/** "B-17 MultiGardens" → "b17multigardens": ignores spaces, dashes and case. */
export function normalizePlace(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
}

/** True when the visitor's text names this place (or vice versa). */
export function placeMatches(place: string, query: string) {
  const p = normalizePlace(place);
  const q = normalizePlace(query);
  if (q.length < 2 || !p) return false;
  if (p.includes(q)) return true;
  // Each word the visitor typed (3+ letters) found in the place name, e.g. "wah cantt".
  const words = query.toLowerCase().split(/[^a-z0-9]+/).map(normalizePlace).filter((w) => w.length >= 3);
  return words.length > 0 && words.every((w) => p.includes(w));
}

/** "Wah Cantt → Islamabad" → { from: "Wah Cantt", to: "Islamabad" }. */
export function routeEnds(name: string) {
  const parts = name.split(/\s*(?:→|->|—>|\bto\b)\s*/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { from: name.trim(), to: null as string | null };
  return { from: parts[0], to: parts[parts.length - 1] };
}

export type RouteMatch = { route: LiveRoute; stops: string[] };

export type CoverageAnswer =
  | { kind: 'idle' }
  | { kind: 'covered'; areas: string[]; routes: RouteMatch[] }
  | { kind: 'not-listed'; query: string };

/**
 * Answers "do you pick up near me?" from real data only: pickup areas,
 * named stops per route, and route names. Cheapest matching route first.
 */
export function answerCoverage(
  query: string,
  data: { zones: string[]; stops: PickupStop[]; routes: LiveRoute[] },
): CoverageAnswer {
  const trimmed = query.trim();
  if (normalizePlace(trimmed).length < 2) return { kind: 'idle' };

  const areas = data.zones.filter((zone) => placeMatches(zone, trimmed));
  const byRoute = new Map<string, Set<string>>();
  for (const stop of data.stops) {
    if (!placeMatches(stop.name, trimmed)) continue;
    if (!byRoute.has(stop.routeId)) byRoute.set(stop.routeId, new Set());
    byRoute.get(stop.routeId)!.add(stop.name);
  }
  for (const route of data.routes) {
    if (byRoute.has(route.id)) continue;
    const { from } = routeEnds(route.name);
    if (placeMatches(from, trimmed)) byRoute.set(route.id, new Set());
  }

  const routes = data.routes
    .filter((route) => byRoute.has(route.id))
    .map((route) => ({ route, stops: [...byRoute.get(route.id)!] }))
    .sort((a, b) => a.route.price - b.route.price);

  if (!areas.length && !routes.length) return { kind: 'not-listed', query: trimmed };
  return { kind: 'covered', areas, routes };
}

/** Stops to draw on a route's line, in the order the database lists them. */
export function stopsForRoute(routeId: string, stops: PickupStop[]) {
  return [...new Set(stops.filter((stop) => stop.routeId === routeId).map((stop) => stop.name))];
}
