'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPakistanDate } from '@/lib/date/pakistan';
import { PROBLEM_LABELS, STATUS_LABELS, type ProblemType, type TripKind, type TripLeg } from '@/lib/ops/trip-messages';

type Event = { leg: TripLeg; kind: TripKind; problem_type: ProblemType | null; created_at: string; resolved_at: string | null };

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });

/** The latest update from today's driver, refreshed every minute. */
export default function TripStatus({ supabase, driverId, demo }: { supabase: SupabaseClient; driverId: string | null; demo: boolean }) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (demo || !driverId) return;
    const today = getPakistanDate();
    const load = () =>
      void supabase
        .from('trip_events')
        .select('leg, kind, problem_type, created_at, resolved_at')
        .eq('trip_date', today)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => data && setEvents(data as Event[]));
    load();
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [demo, driverId, supabase]);

  const latest = events[0];
  if (!latest) return null;
  const openProblem = events.find((event) => event.kind === 'problem' && !event.resolved_at && event.leg === latest.leg);
  const text =
    latest.kind === 'problem'
      ? `Delay: ${PROBLEM_LABELS[latest.problem_type ?? 'other'].toLowerCase()}`
      : STATUS_LABELS[latest.leg][latest.kind];

  return (
    <div role="status" className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${latest.kind === 'problem' || openProblem ? 'border-red-300/20 bg-red-300/[0.06]' : 'border-emerald-300/15 bg-emerald-300/[0.06]'}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${latest.kind === 'problem' ? 'bg-red-300' : 'bg-emerald-300'}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${latest.kind === 'problem' ? 'bg-red-300' : 'bg-emerald-300'}`} />
      </span>
      <p className="text-sm text-white">
        <span className="font-semibold capitalize">{latest.leg}:</span> {text}
        <span className="ml-2 text-xs text-zinc-400">{time(latest.created_at)}</span>
      </p>
    </div>
  );
}
