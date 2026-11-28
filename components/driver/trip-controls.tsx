'use client';

import { useState } from 'react';
import Icon from '@/components/ui/icons';
import { driverApi } from '@/lib/driver/api';
import { PROBLEM_LABELS, PROBLEM_TYPES, STATUS_LABELS, type ProblemType, type TripKind, type TripLeg } from '@/lib/ops/trip-messages';

export type TripEvent = { id: string; leg: TripLeg; kind: TripKind; problem_type: ProblemType | null; created_at: string; riders_notified: number };

const STEPS: Exclude<TripKind, 'problem'>[] = ['on_the_way', 'arriving', 'arrived'];
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' });

/** Trip status buttons and the problem report, for today's trip. */
export default function TripControls({
  leg,
  onLegChange,
  events,
  onSent,
  available,
}: {
  leg: TripLeg;
  onLegChange: (leg: TripLeg) => void;
  events: TripEvent[];
  onSent: () => void;
  /** False until the driver-operations database update is applied. */
  available: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [problem, setProblem] = useState<ProblemType>('traffic');
  const [note, setNote] = useState('');
  const [tellRiders, setTellRiders] = useState(true);

  const sentFor = (kind: TripKind) => events.find((event) => event.leg === leg && event.kind === kind);

  const send = async (kind: TripKind, extra: Record<string, unknown> = {}) => {
    setBusy(kind);
    setNotice(null);
    const result = await driverApi('/api/driver/trip-status', { leg, kind, ...extra });
    setBusy(null);
    if (!result.ok) {
      setNotice({ tone: 'error', text: result.error ?? 'Could not send the update.' });
      return false;
    }
    setNotice({
      tone: 'ok',
      text: result.notified ? `Sent. ${result.notified} rider${result.notified === 1 ? '' : 's'} told on WhatsApp.` : 'Saved.',
    });
    onSent();
    return true;
  };

  return (
    <section aria-labelledby="trip-status-title" className="rounded-3xl border border-white/[0.08] bg-[#10151d] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/70">Today&apos;s trip</p>
          <h2 id="trip-status-title" className="mt-1 text-lg font-semibold text-white">Trip status</h2>
        </div>
        <div role="group" aria-label="Trip" className="flex rounded-xl border border-white/[0.08] bg-[#0b1016] p-1">
          {(['morning', 'evening'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={leg === value}
              onClick={() => onLegChange(value)}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold capitalize transition ${leg === value ? 'bg-yellow-300 text-[#15110a]' : 'text-zinc-400 hover:text-white'}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {!available ? (
        <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100">
          Trip updates switch on once the admin applies the latest database update.
        </p>
      ) : (
        <>
          <ol className="mt-5 grid gap-2 sm:grid-cols-3">
            {STEPS.map((kind, index) => {
              const sent = sentFor(kind);
              return (
                <li key={kind}>
                  <button
                    type="button"
                    disabled={Boolean(busy) || Boolean(sent)}
                    aria-busy={busy === kind}
                    data-loading={busy === kind ? 'true' : undefined}
                    onClick={() => void send(kind)}
                    className={`ee-btn w-full justify-start gap-3 py-3 text-left ${sent ? 'ee-btn-secondary !opacity-100' : index === 0 || sentFor(STEPS[index - 1]) ? 'ee-btn-primary' : 'ee-btn-secondary'}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${sent ? 'bg-emerald-300 text-[#04170d]' : 'bg-black/20'}`}>
                      {sent ? <Icon name="check" size={14} strokeWidth={2.4} /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{STATUS_LABELS[leg][kind]}</span>
                      {sent && <span className="block text-xs font-normal text-zinc-400">Sent {time(sent.created_at)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {!reporting ? (
            <button type="button" onClick={() => setReporting(true)} className="ee-btn ee-btn-ghost mt-3 w-full text-red-200 hover:text-red-100 sm:w-auto">
              <Icon name="help" size={18} /> Report a problem
            </button>
          ) : (
            <form
              className="ee-enter mt-4 rounded-2xl border border-red-300/20 bg-red-300/[0.05] p-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (await send('problem', { problemType: problem, note: note.trim() || undefined, notifyRiders: tellRiders })) {
                  setReporting(false);
                  setNote('');
                }
              }}
            >
              <fieldset>
                <legend className="text-sm font-semibold text-white">What&apos;s wrong?</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {PROBLEM_TYPES.map((type) => (
                    <label key={type} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${problem === type ? 'border-red-300/40 bg-red-300/10 text-white' : 'border-white/[0.08] text-zinc-300'}`}>
                      <input type="radio" name="problem" value={type} checked={problem === type} onChange={() => setProblem(type)} className="accent-red-300" />
                      {PROBLEM_LABELS[type]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-3 block text-sm text-zinc-300">
                Note for the admin (optional)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="ee-input mt-1.5" placeholder="Where are you, how long is the delay?" />
              </label>
              <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-zinc-200">
                <input type="checkbox" checked={tellRiders} onChange={(e) => setTellRiders(e.target.checked)} className="h-5 w-5 accent-yellow-300" />
                Tell my riders their ride is delayed
              </label>
              <div className="mt-3 flex gap-2">
                <button type="submit" disabled={Boolean(busy)} aria-busy={busy === 'problem'} data-loading={busy === 'problem' ? 'true' : undefined} className="ee-btn ee-btn-primary flex-1">
                  Send report
                </button>
                <button type="button" onClick={() => setReporting(false)} className="ee-btn ee-btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {events.some((event) => event.kind === 'problem') && (
            <p className="mt-3 text-xs text-zinc-500">
              Problems reported today:{' '}
              {events
                .filter((event) => event.kind === 'problem')
                .map((event) => `${PROBLEM_LABELS[event.problem_type ?? 'other']} at ${time(event.created_at)}`)
                .join(', ')}
            </p>
          )}
        </>
      )}

      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${notice.tone === 'error' ? 'text-red-200' : 'text-emerald-200'}`}>
          {notice.text}
        </p>
      )}
    </section>
  );
}
