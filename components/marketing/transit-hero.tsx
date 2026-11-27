'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import Icon from '@/components/ui/icons';
import { WHATSAPP_GENERAL, whatsappLink } from '@/lib/brand';
import { useSessionDestination } from '@/lib/auth/use-session-destination';
import { formatPkr } from '@/lib/onboarding/pricing';
import { answerCoverage, placeMatches, routeEnds, stopsForRoute } from '@/lib/public/coverage';
import type { LiveRoute, PickupStop } from '@/lib/public/landing-data';
import { seatBadge } from '@/lib/public/seats';
import { useCountUp } from '@/lib/ui/use-count-up';

type Props = {
  routes: LiveRoute[];
  zones: string[];
  stops: PickupStop[];
  cities: readonly string[];
  registration: string;
};

/**
 * Hero: the visitor's first question ("do you come to my area, and what
 * does it cost?") answered in place, next to the real route line.
 */
export default function TransitHero({ routes, zones, stops, cities, registration }: Props) {
  const [query, setQuery] = useState('');
  const [pickedRouteId, setPickedRouteId] = useState<string | null>(null);
  const inputId = useId();
  const answerId = useId();
  const session = useSessionDestination();

  const answer = useMemo(() => answerCoverage(query, { zones, stops, routes }), [query, zones, stops, routes]);
  const matchedRouteId = answer.kind === 'covered' ? answer.routes[0]?.route.id : undefined;
  const activeRoute = routes.find((r) => r.id === (matchedRouteId ?? pickedRouteId)) ?? routes[0] ?? null;

  const reserveHref = session.state === 'signed-in' ? session.href : '/auth/signup';
  const reserveLabel = session.state === 'signed-in' ? session.label : 'Reserve my seat';
  const suggestions = zones.slice(0, 4);

  return (
    <section id="home" className="relative isolate scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="ee-network-grid absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pb-24">
        <div className="ee-stagger min-w-0">
          <p className="ee-mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            <span className="inline-flex items-center gap-1.5 text-yellow-200"><Icon name="shield" size={14} />SECP registered</span>
            <span aria-hidden="true" className="hidden text-zinc-600 sm:inline">/</span>
            <span>{cities.join(' · ')}</span>
          </p>

          <h1 className="ee-display mt-5 max-w-[13ch] text-[2.6rem] text-white sm:text-6xl xl:text-[4.6rem]">
            Your daily ride to campus, <span className="text-yellow-300">handled.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
            Door-to-campus transport for students and staff. Set your week&apos;s times once, see your van and driver before you leave home, and get updates on WhatsApp.
          </p>

          {/* Is my area covered? */}
          <div className="mt-8 max-w-xl rounded-[1.25rem] border border-white/10 bg-[#0b1018]/90 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-4">
            <label htmlFor={inputId} className="flex items-center justify-between px-1 text-sm font-semibold text-white">
              Is my area covered?
              <span className="ee-mono text-[10px] font-normal uppercase tracking-[0.14em] text-zinc-500">Instant answer</span>
            </label>
            <div className="relative mt-2.5">
              <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id={inputId}
                type="search"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby={answerId}
                placeholder="Sector or town, e.g. B-17"
                className="min-h-14 w-full rounded-2xl border border-white/12 bg-[#070b10] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-500 focus-visible:outline-none focus:border-yellow-300/60 focus:shadow-[0_0_0_4px_rgba(232,187,64,0.12)]"
              />
            </div>

            <div id={answerId} aria-live="polite" className="px-1">
              {answer.kind === 'idle' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">Try</span>
                  {suggestions.map((zone) => (
                    <button key={zone} type="button" onClick={() => setQuery(zone)} className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-medium text-zinc-300 transition hover:border-yellow-300/40 hover:text-white">
                      {zone}
                    </button>
                  ))}
                </div>
              )}

              {answer.kind === 'covered' && (
                <div className="ee-enter mt-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-emerald-200">
                    <Icon name="check" size={18} className="mt-0.5 shrink-0" />
                    <span>
                      Yes, we pick up {answer.routes[0]?.stops[0] || answer.areas[0] ? <>at <span className="text-white">{answer.routes[0]?.stops[0] ?? answer.areas[0]}</span></> : 'in your area'}.
                    </span>
                  </p>
                  {answer.routes.length > 0 ? (
                    <ul className="mt-3 divide-y divide-white/[0.07] overflow-hidden rounded-xl border border-white/10">
                      {answer.routes.slice(0, 3).map(({ route }) => {
                        const badge = seatBadge(route.seatsLeft);
                        const full = route.seatsLeft === 0;
                        return (
                          <li key={route.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-white/[0.02] px-3.5 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{route.name}</p>
                              <p className="mt-0.5 text-xs text-zinc-400">
                                <span className="ee-mono text-yellow-200">{formatPkr(route.price)}</span> / month
                                {badge && <span className="ml-2 text-zinc-500">· {badge.text}</span>}
                              </p>
                            </div>
                            {full ? (
                              <a href={whatsappLink(`Hi Eagle Elites, the ${route.name} route shows as full. Please add me to the waitlist.`)} target="_blank" rel="noopener noreferrer" className="ee-btn ee-btn-secondary min-h-11 px-4 text-sm">
                                Join waitlist
                              </a>
                            ) : (
                              <Link prefetch={false} href={reserveHref} className="ee-btn ee-btn-primary min-h-11 px-4 text-sm">
                                Reserve <Icon name="arrow-right" size={16} />
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-400">Message us and we&apos;ll tell you the exact stop and fare.</p>
                  )}
                </div>
              )}

              {answer.kind === 'not-listed' && (
                <div className="ee-enter mt-4">
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold text-white">&ldquo;{answer.query}&rdquo; isn&apos;t on our list yet.</span> New stops open where riders ask for them.
                  </p>
                  <a href={whatsappLink(`Hi Eagle Elites, do you pick up from ${answer.query}? I'd like transport to campus.`)} target="_blank" rel="noopener noreferrer" className="ee-btn ee-btn-whatsapp mt-3 min-h-11 px-4 text-sm">
                    <Icon name="whatsapp" size={18} /> Ask for a stop here
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* On phones the sticky bar at the bottom carries these two actions. */}
          <div className="mt-6 hidden gap-3 sm:flex">
            <Link prefetch={false} href={reserveHref} className="ee-btn ee-btn-primary ee-btn-lg">
              {reserveLabel} <Icon name="arrow-right" size={18} />
            </Link>
            <a href={WHATSAPP_GENERAL} target="_blank" rel="noopener noreferrer" className="ee-btn ee-btn-secondary ee-btn-lg">
              <Icon name="whatsapp" size={20} className="text-[#25d366]" /> Ask on WhatsApp
            </a>
          </div>
          <p className="mt-3 max-w-xl text-xs leading-5 text-zinc-500">
            Applying doesn&apos;t confirm a seat. Your seat is confirmed once your payment is verified. <span className="sr-only">{registration}.</span>
          </p>
        </div>

        <RouteLine
          routes={routes}
          zones={zones}
          stops={stops}
          active={activeRoute}
          query={query}
          onPick={(id) => {
            setPickedRouteId(id);
            setQuery('');
          }}
        />
      </div>
    </section>
  );
}

function RouteLine({
  routes,
  zones,
  stops,
  active,
  query,
  onPick,
}: {
  routes: LiveRoute[];
  zones: string[];
  stops: PickupStop[];
  active: LiveRoute | null;
  query: string;
  onPick: (routeId: string) => void;
}) {
  const ends = active ? routeEnds(active.name) : null;
  const routeStops = active ? stopsForRoute(active.id, stops) : [];
  // No named stops for this route (or no routes at all): show the start
  // point, or the pickup areas as a network overview.
  const stations = routeStops.length ? routeStops : active ? [ends!.from] : zones.slice(0, 6);
  const terminus = ends?.to ?? 'Your campus';
  const fare = useCountUp(active?.price ?? 0);
  const badge = active ? seatBadge(active.seatsLeft) : null;

  return (
    <aside aria-label="Route line" className="ee-enter relative mx-auto w-full max-w-md self-center [animation-delay:120ms] lg:max-w-none">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1018] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <p className="ee-mono text-[11px] uppercase tracking-[0.16em] text-zinc-400">{active ? 'Line' : 'Network'}</p>
          <p className="ee-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">{routes.length ? `${routes.length} routes` : `${zones.length} pickup areas`}</p>
        </div>

        {routes.length > 1 && (
          <div role="group" aria-label="Choose a route" className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-4 py-3 [scrollbar-width:none]">
            {routes.map((route) => {
              const selected = route.id === active?.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(route.id)}
                  className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold transition ${selected ? 'bg-yellow-300 text-[#15110a]' : 'border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white'}`}
                >
                  {routeEnds(route.name).from}
                </button>
              );
            })}
          </div>
        )}

        <ol key={active?.id ?? 'network'} className="ee-line relative px-6 py-6">
          <span aria-hidden="true" className="ee-line-track absolute bottom-[2.6rem] left-[2.05rem] top-[2.1rem] w-[3px] rounded-full" />
          {stations.map((station, index) => {
            const here = query.trim() && placeMatches(station, query);
            return (
              <li key={`${station}-${index}`} className="ee-station relative flex min-h-11 items-center gap-4" style={{ animationDelay: `${180 + index * 90}ms` }}>
                <span aria-hidden="true" className={`relative z-10 ml-[0.2rem] h-3.5 w-3.5 shrink-0 rounded-full border-[3px] ${here ? 'border-yellow-300 bg-yellow-300 shadow-[0_0_0_6px_rgba(232,187,64,0.2)]' : 'border-yellow-300 bg-[#0b1018]'}`} />
                <span className={`text-sm ${here ? 'font-semibold text-white' : 'text-zinc-300'}`}>{station}</span>
                {here && <span className="ee-mono rounded-full bg-yellow-300/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-yellow-200">Your stop</span>}
              </li>
            );
          })}
          <li className="ee-station relative mt-1 flex min-h-12 items-center gap-4" style={{ animationDelay: `${180 + stations.length * 90}ms` }}>
            <span aria-hidden="true" className="relative z-10 flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center rounded-md bg-yellow-300 text-[#15110a]">
              <Icon name="bus" size={13} strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-zinc-500">To campus</span>
              <span className="block truncate text-base font-bold text-white">{terminus}</span>
            </span>
          </li>
        </ol>

        {active && (
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-white/15 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Monthly fare</p>
              <p className="ee-mono mt-1 text-2xl text-yellow-200 tabular-nums">{formatPkr(fare)}</p>
            </div>
            {badge && <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.tone}`}>{badge.text}</span>}
            <a href="#fares" className="ee-btn ee-btn-ghost -mr-2 min-h-11 px-3 text-sm">
              All fares <Icon name="arrow-right" size={16} />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
