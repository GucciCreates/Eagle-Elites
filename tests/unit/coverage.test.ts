import { describe, expect, it } from 'vitest';
import { answerCoverage, normalizePlace, placeMatches, routeEnds, stopsForRoute } from '@/lib/public/coverage';

const routes = [
  { id: 'r1', name: 'Wah Cantt → Islamabad', price: 9500, seatsLeft: 14 },
  { id: 'r2', name: 'Rawalpindi → H-11 / NUST', price: 8000, seatsLeft: 3 },
  { id: 'r3', name: 'Hassan Abdal → E-9 / Air Uni', price: 11000, seatsLeft: 0 },
];
const stops = [
  { name: 'B-17 MultiGardens', routeId: 'r2' },
  { name: 'Saddar', routeId: 'r2' },
  { name: 'Wah Model Town', routeId: 'r1' },
  { name: 'GT Road / Taxila', routeId: 'r1' },
  { name: 'GT Road / Taxila', routeId: 'r3' },
];
const zones = ['B-17 MultiGardens', 'Wah Cantt (Br 1–3)', 'Hassan Abdal'];

describe('place matching', () => {
  it('ignores case, spaces and dashes', () => {
    expect(normalizePlace('B-17 MultiGardens')).toBe('b17multigardens');
    expect(placeMatches('B-17 MultiGardens', 'b17')).toBe(true);
    expect(placeMatches('B-17 MultiGardens', 'B 17')).toBe(true);
    expect(placeMatches('Wah Cantt (Br 1–3)', 'wah cantt')).toBe(true);
  });

  it('needs at least two characters and every word', () => {
    expect(placeMatches('Saddar', 's')).toBe(false);
    expect(placeMatches('Wah Model Town', 'wah satellite')).toBe(false);
  });
});

describe('routeEnds', () => {
  it('splits on arrows', () => {
    expect(routeEnds('Wah Cantt → Islamabad')).toEqual({ from: 'Wah Cantt', to: 'Islamabad' });
    expect(routeEnds('Rawalpindi -> H-11 / NUST')).toEqual({ from: 'Rawalpindi', to: 'H-11 / NUST' });
    expect(routeEnds('Express')).toEqual({ from: 'Express', to: null });
  });
});

describe('answerCoverage', () => {
  it('stays idle until the visitor types something meaningful', () => {
    expect(answerCoverage(' ', { zones, stops, routes })).toEqual({ kind: 'idle' });
  });

  it('finds the route through a named stop', () => {
    const answer = answerCoverage('b17', { zones, stops, routes });
    expect(answer.kind).toBe('covered');
    if (answer.kind !== 'covered') return;
    expect(answer.areas).toEqual(['B-17 MultiGardens']);
    expect(answer.routes.map((r) => r.route.id)).toEqual(['r2']);
    expect(answer.routes[0].stops).toEqual(['B-17 MultiGardens']);
  });

  it('lists every route through a shared stop, cheapest first', () => {
    const answer = answerCoverage('taxila', { zones, stops, routes });
    expect(answer.kind === 'covered' && answer.routes.map((r) => r.route.id)).toEqual(['r1', 'r3']);
  });

  it('falls back to where a route starts', () => {
    const answer = answerCoverage('hassan abdal', { zones, stops: [], routes });
    expect(answer.kind === 'covered' && answer.routes.map((r) => r.route.id)).toEqual(['r3']);
  });

  it('says so honestly when an area is not listed', () => {
    expect(answerCoverage('Murree', { zones, stops, routes })).toEqual({ kind: 'not-listed', query: 'Murree' });
  });
});

describe('stopsForRoute', () => {
  it('keeps order and removes duplicates', () => {
    expect(stopsForRoute('r1', stops)).toEqual(['Wah Model Town', 'GT Road / Taxila']);
  });
});
