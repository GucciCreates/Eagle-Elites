'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
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

export default function FareCalculator({ routes }: { routes: LiveRoute[] }) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '');
  const [wantsAc, setWantsAc] = useState(false);
  const selectId = useId();
  const route = routes.find((r) => r.id === routeId) ?? routes[0];

  if (!route) return null;

  const monthly = monthlyFee(route.price, wantsAc);
  const first = amountDue(route.price, wantsAc);
  const badge = seatBadge(route.seatsLeft);

  return (
    <div className="rounded-[2rem] border border-yellow-300/15 bg-[linear-gradient(160deg,rgba(232,187,64,0.08),rgba(11,16,24,0.95)_45%)] p-5 shadow-2xl shadow-black/40 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-300">Fare calculator</p>
        {badge && (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.tone}`}>{badge.text}</span>
        )}
      </div>

      <label htmlFor={selectId} className="mt-5 block text-sm font-medium text-zinc-300">
        Your route
      </label>
      <select
        id={selectId}
        value={route.id}
        onChange={(e) => setRouteId(e.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#0a0f16] px-3 text-base text-white focus:border-yellow-300/60"
      >
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} — {formatPkr(r.price)}
          </option>
        ))}
      </select>

      <button
        type="button"
        role="switch"
        aria-checked={wantsAc}
        onClick={() => setWantsAc((v) => !v)}
        className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:border-white/20"
      >
        <span>
          <span className="block text-sm font-semibold text-white">Air-conditioned vehicle</span>
          <span className="block text-xs text-zinc-400">+{formatPkr(AC_SURCHARGE)} per month</span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${wantsAc ? 'bg-yellow-400' : 'bg-zinc-700'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${wantsAc ? 'left-6' : 'left-1'}`} />
        </span>
      </button>

      <dl className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm" aria-live="polite">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">Monthly fee</dt>
          <dd className="font-semibold text-white">{formatPkr(monthly)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-400">One-time reservation fee</dt>
          <dd className="font-semibold text-white">{formatPkr(RESERVATION_FEE)}</dd>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-dashed border-white/15 pt-3">
          <dt className="font-semibold text-zinc-200">First payment</dt>
          <dd className="text-3xl font-black tracking-tight text-yellow-200">{formatPkr(first)}</dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link
          href="/auth/signup"
          className="ee-btn ee-btn-primary min-h-12"
        >
          {route.seatsLeft === 0 ? 'Join the waitlist' : 'Reserve this route'}
        </Link>
        <a
          href={whatsappLink(
            `Hi Eagle Elites, I'm interested in the ${route.name} route${wantsAc ? ' (AC)' : ''}. Could you confirm pickup points and timings?`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white hover:border-yellow-300/40"
        >
          Ask about timings ↗
        </a>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Fares come straight from our live route list. Bank details and your payment reference appear during the application.
      </p>
    </div>
  );
}
