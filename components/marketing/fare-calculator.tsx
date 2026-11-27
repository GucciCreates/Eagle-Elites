'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import Icon from '@/components/ui/icons';
import { whatsappLink } from '@/lib/brand';
import {
  AC_SURCHARGE,
  RESERVATION_FEE,
  amountDue,
  formatPkr,
  monthlyFee,
} from '@/lib/onboarding/pricing';
import type { LiveRoute } from '@/lib/public/landing-data';
import { seatBadge } from '@/lib/public/seats';
import { useCountUp } from '@/lib/ui/use-count-up';

/** Fare calculator styled as a printed receipt. Pricing rules live in lib/onboarding/pricing. */
export default function FareCalculator({ routes }: { routes: LiveRoute[] }) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [wantsAc, setWantsAc] = useState(false);
  const selectId = useId();
  const route = routes.find((r) => r.id === routeId) ?? routes[0];

  const monthly = monthlyFee(route?.price ?? 0, wantsAc);
  const first = amountDue(route?.price ?? 0, wantsAc);
  const shownFirst = useCountUp(first);

  if (!route) return null;
  const badge = seatBadge(route.seatsLeft);
  const full = route.seatsLeft === 0;

  return (
    <div className="ee-receipt relative rounded-t-[1.5rem] bg-[#f4efe2] px-5 pb-8 pt-6 text-[#15110a] shadow-[0_30px_70px_rgba(0,0,0,0.45)] sm:px-7">
      <div className="flex items-center justify-between gap-3">
        <p className="ee-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5240]">Fare calculator</p>
        {badge && <span className="ee-mono rounded-full border border-[#15110a]/20 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em]">{badge.text}</span>}
      </div>

      <label htmlFor={selectId} className="mt-5 block text-sm font-semibold">
        Your route
      </label>
      <div className="relative mt-2">
        <select
          id={selectId}
          value={route.id}
          onChange={(e) => setRouteId(e.target.value)}
          className="min-h-12 w-full appearance-none rounded-xl border border-[#15110a]/20 bg-white/70 px-3 pr-10 text-base font-medium text-[#15110a] outline-none focus:border-[#15110a] focus:ring-2 focus:ring-[#15110a]/15 [color-scheme:light]"
        >
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <Icon name="arrow-right" size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-[#5b5240]" />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={wantsAc}
        onClick={() => setWantsAc((v) => !v)}
        className="mt-3 flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border border-[#15110a]/15 bg-white/50 px-4 py-2.5 text-left transition hover:border-[#15110a]/35"
      >
        <span className="flex items-center gap-2.5">
          <Icon name="snow" size={18} />
          <span>
            <span className="block text-sm font-semibold">Air-conditioned vehicle</span>
            <span className="block text-xs text-[#5b5240]">+{formatPkr(AC_SURCHARGE)} per month</span>
          </span>
        </span>
        <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition ${wantsAc ? 'bg-[#15110a]' : 'bg-[#15110a]/20'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full shadow transition-all ${wantsAc ? 'left-6 bg-yellow-300' : 'left-1 bg-white'}`} />
        </span>
      </button>

      <dl className="ee-mono mt-6 space-y-2.5 text-[13px]" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt>Monthly fee{wantsAc ? ' (AC)' : ''}</dt>
          <dd className="tabular-nums">{formatPkr(monthly)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Reservation fee (one-time)</dt>
          <dd className="tabular-nums">{formatPkr(RESERVATION_FEE)}</dd>
        </div>
        <div className="flex items-end justify-between gap-4 border-t-2 border-dashed border-[#15110a]/30 pt-3">
          <dt className="font-sans text-sm font-bold">First payment</dt>
          <dd className="text-2xl tabular-nums sm:text-3xl">{formatPkr(shownFirst)}</dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {full ? (
          <a
            href={whatsappLink(`Hi Eagle Elites, the ${route.name} route shows as full. Please add me to the waitlist.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="ee-btn ee-btn-ink"
          >
            Join the waitlist
          </a>
        ) : (
          <Link prefetch={false} href="/auth/signup" className="ee-btn ee-btn-ink">
            Reserve this route <Icon name="arrow-right" size={16} />
          </Link>
        )}
        <a
          href={whatsappLink(
            `Hi Eagle Elites, I'm interested in the ${route.name} route${wantsAc ? ' (AC)' : ''}. Could you confirm pickup points and timings?`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="ee-btn ee-btn-ink-outline"
        >
          <Icon name="whatsapp" size={18} /> Ask about timings
        </a>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#5b5240]">
        Fares come from our live route list. Bank details and your payment reference appear during your application.
      </p>
    </div>
  );
}
