'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchOperationsSettings } from '@/lib/settings/operations';
import Icon from '@/components/ui/icons';
import { adminApi } from '@/lib/admin/api';
import { addDays, getPakistanDate } from '@/lib/date/pakistan';
import type { Plan } from '@/lib/ops/plan';
import { card, input, label } from './ui';

type PlanResult = { plan: Plan; inserted: number; whatsapp: { sent: number; failed: number; skipped: number } | null };

const pretty = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Builds a day's trips from weekly schedules in one go, then publishes them. */
export default function PlanTab({ canPublish, onPublished }: { canPublish: boolean; onPublished?: () => void }) {
  const [autoPlan, setAutoPlan] = useState<boolean | null>(null);
  useEffect(() => {
    void fetchOperationsSettings(createClient()).then((settings) => setAutoPlan(settings ? settings.auto_plan : null));
  }, []);
  const [today] = useState(() => getPakistanDate());
  const [date, setDate] = useState(() => addDays(getPakistanDate(), 1));
  const [busy, setBusy] = useState<'preview' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PlanResult | null>(null);
  const [published, setPublished] = useState<PlanResult | null>(null);

  const run = async (publish: boolean) => {
    setBusy(publish ? 'publish' : 'preview');
    setError('');
    if (publish) setPublished(null);
    const response = await adminApi<PlanResult>('/api/admin/plan', { body: { date, publish } });
    setBusy(null);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    if (publish) {
      setPublished(response);
      onPublished?.();
    }
    setResult(response);
  };

  const plan = result?.plan;
  const newRows = plan?.rows.length ?? 0;
  const unplaced = plan?.routes.reduce((sum, route) => sum + route.unplaced.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <section className={card} aria-labelledby="plan-title">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Trips in one go</p>
        <h2 id="plan-title" className="mt-1 text-xl font-semibold text-white">Plan a day</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Builds the day&apos;s trips from students&apos; weekly schedules: each rider goes in their route&apos;s usual vehicle with its usual driver. Trips you already set by hand are kept. Students who marked the day &ldquo;not riding&rdquo; are left out.
        </p>
        {autoPlan !== null && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
            <Icon name="clock" size={14} />
            {autoPlan ? 'Tomorrow is published automatically at about 9:30 PM.' : 'Automatic publishing is off (Settings).'}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-48">
            <span className={label}>Day</span>
            <input
              type="date"
              aria-label="Plan date"
              min={today}
              max={addDays(today, 14)}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setResult(null);
                setPublished(null);
              }}
              className={input}
            />
          </label>
          <button type="button" onClick={() => void run(false)} disabled={Boolean(busy) || !date} aria-busy={busy === 'preview'} data-loading={busy === 'preview' ? 'true' : undefined} className="ee-btn ee-btn-secondary">
            Preview
          </button>
          {canPublish && (
            <button type="button" onClick={() => void run(true)} disabled={Boolean(busy) || !plan || newRows === 0} aria-busy={busy === 'publish'} data-loading={busy === 'publish' ? 'true' : undefined} className="ee-btn ee-btn-primary">
              Publish {newRows > 0 ? `${newRows} trip${newRows === 1 ? '' : 's'}` : 'trips'}
            </button>
          )}
        </div>
        {!canPublish && <p className="mt-3 text-xs text-zinc-500">Only owners and operations staff can publish.</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-200">{error}</p>}
        {published && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100">
            Published {published.inserted} trip{published.inserted === 1 ? '' : 's'} for {pretty(date)}.
            {published.whatsapp ? ` WhatsApp: ${published.whatsapp.sent} sent, ${published.whatsapp.failed} failed, ${published.whatsapp.skipped} skipped.` : ''}
          </p>
        )}
      </section>

      {plan && (
        <section aria-label="Plan preview" className="space-y-3">
          {plan.holiday ? (
            <p className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] px-5 py-4 text-sm text-sky-100">No service on {pretty(plan.date)}: {plan.holiday}. Nothing to plan.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-yellow-400/10 px-3 py-1 font-semibold text-yellow-100">{newRows} new trip{newRows === 1 ? '' : 's'}</span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">{plan.routes.reduce((sum, route) => sum + route.alreadyAssigned, 0)} already set</span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">{plan.routes.reduce((sum, route) => sum + route.skipped, 0)} not riding</span>
                {unplaced > 0 && <span className="rounded-full bg-red-500/15 px-3 py-1 font-semibold text-red-200">{unplaced} without a seat</span>}
              </div>
              {plan.routes.length === 0 && <p className="rounded-2xl border border-dashed border-zinc-700 px-5 py-8 text-center text-sm text-zinc-400">No routes with riders on this day.</p>}
              <div className="grid gap-3 lg:grid-cols-2">
                {plan.routes.map((route) => (
                  <article key={route.route_id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold text-white">{route.route_name}</h3>
                      <span className="text-xs text-zinc-400">{route.riders} rider{route.riders === 1 ? '' : 's'}</span>
                    </div>
                    {route.vehicles.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {route.vehicles.map((vehicle) => (
                          <li key={vehicle.coaster_id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950/60 px-3 py-2 text-sm">
                            <span className="text-zinc-200">
                              <Icon name="bus" size={15} className="mr-1.5 inline text-yellow-300" />
                              {vehicle.coaster_number} · {vehicle.driver_name}
                            </span>
                            <span className={`ee-mono text-xs ${vehicle.taken + vehicle.added >= vehicle.seats ? 'text-amber-200' : 'text-zinc-400'}`}>
                              {vehicle.taken + vehicle.added}/{vehicle.seats}
                              {vehicle.added > 0 ? ` (+${vehicle.added})` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 text-xs text-zinc-500">
                      {route.alreadyAssigned} already set · {route.skipped} not riding · {route.notScheduled} with no trip in their schedule
                    </p>
                    {route.unplaced.length > 0 && <p className="mt-2 text-xs text-red-200">No seat: {route.unplaced.join(', ')}</p>}
                    {route.warnings.map((warning) => (
                      <p key={warning} className="mt-2 text-xs text-amber-200">{warning}</p>
                    ))}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
