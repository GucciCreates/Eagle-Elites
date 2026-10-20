'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ProofViewer from '@/components/admin/proof-viewer';
import { notifyWhatsApp, type NotifyResponse } from '@/lib/whatsapp/client';
import { REJECTION_REASONS } from '@/lib/onboarding/rejection-reasons';
import { formatPkr } from '@/lib/onboarding/pricing';

export type ApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  user_type: string;
  institution: string;
  cnic_last4: string;
  phone: string;
  pickup_area: string;
  preferred_morning: string;
  preferred_evening: string;
  payment_transaction_id: string;
  payment_proof_url: string;
  applied_at: string;
  status: string;
  departure_group_id?: string | null;
  requested_route_id?: string | null;
  pickup_point_id?: string | null;
  wants_ac?: boolean | null;
  amount_due?: number | null;
  payment_reference?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_relation?: string | null;
  student_id_card_path?: string | null;
  waitlisted?: boolean | null;
  resubmission_count?: number | null;
};

type Props = {
  applications: ApplicationRow[];
  onRemove: (ids: string[]) => void;
  routes: { id: string; name: string; price: number }[];
  groups: { id: string; university: string; department: string }[];
  allTransactions: { id: string; payment_transaction_id: string | null }[];
  onWhatsApp: (result: NotifyResponse) => void;
};

function parseDbTime(iso: string) {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

function waitLabel(iso: string | null) {
  if (!iso) return { text: 'not submitted', tone: 'text-zinc-500' };
  const hours = (Date.now() - parseDbTime(iso).getTime()) / 36e5;
  const text =
    hours < 1
      ? `${Math.max(1, Math.round(hours * 60))} min`
      : hours < 48
        ? `${Math.round(hours)} h`
        : `${Math.round(hours / 24)} days`;
  return {
    text: `waiting ${text}`,
    tone:
      hours > 24
        ? 'text-red-300'
        : hours > 12
          ? 'text-amber-300'
          : 'text-emerald-300',
  };
}

export default function ApplicationsTab({
  applications,
  onRemove,
  routes,
  groups,
  allTransactions,
  onWhatsApp,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [points, setPoints] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [reasonCode, setReasonCode] = useState<Record<string, string>>({});
  const [reasonNote, setReasonNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void supabase
      .from('pickup_points')
      .select('id, name')
      .then(({ data }) => {
        if (data)
          setPoints(
            Object.fromEntries(
              data.map((p: { id: string; name: string }) => [p.id, p.name]),
            ),
          );
      });
  }, [supabase]);

  const sorted = useMemo(
    () =>
      [...applications].sort((a, b) =>
        (a.applied_at ?? '').localeCompare(b.applied_at ?? ''),
      ),
    [applications],
  );

  const duplicates = useMemo(() => {
    const byTx = new Map<string, Set<string>>();
    for (const row of [...allTransactions, ...applications]) {
      const tx = row.payment_transaction_id?.trim().toLowerCase();
      if (!tx) continue;
      if (!byTx.has(tx)) byTx.set(tx, new Set());
      byTx.get(tx)!.add(row.id);
    }
    return byTx;
  }, [allTransactions, applications]);

  const routeFor = (app: ApplicationRow) =>
    assign[app.id] ?? app.requested_route_id ?? '';

  const approve = async (ids: string[]) => {
    setError('');
    setBusy(ids.length > 1 ? 'bulk' : ids[0]);
    const done: string[] = [];
    for (const id of ids) {
      const app = applications.find((a) => a.id === id);
      if (!app) continue;
      const routeId = routeFor(app);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          waitlisted: false,
          ...(routeId ? { route_id: routeId } : {}),
        })
        .eq('id', id);
      if (updateError) {
        setError(`Couldn't approve ${app.full_name}: ${updateError.message}`);
        continue;
      }
      done.push(id);
      void notifyWhatsApp({ event: 'approval', studentId: id }).then(
        onWhatsApp,
      );
    }
    onRemove(done);
    setSelected(new Set());
    setBusy(null);
  };

  const reject = async (app: ApplicationRow) => {
    const code = reasonCode[app.id];
    const preset = REJECTION_REASONS.find((r) => r.code === code);
    const note = (reasonNote[app.id] ?? '').trim();
    if (!preset) {
      setError('Pick a rejection reason first.');
      return;
    }
    if (code === 'other' && note.length < 5) {
      setError(
        'Add a short note for “Other” so the student knows what to fix.',
      );
      return;
    }
    setError('');
    setBusy(app.id);
    const message = [preset.message, note].filter(Boolean).join(' ');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        rejection_code: code,
        rejected_reason: message,
      })
      .eq('id', app.id);
    if (updateError) setError(`Couldn't reject: ${updateError.message}`);
    else {
      void notifyWhatsApp({ event: 'rejection', studentId: app.id }).then(
        onWhatsApp,
      );
      onRemove([app.id]);
    }
    setBusy(null);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Applications</h2>
          <p className="text-sm text-zinc-400">
            {applications.length} pending · oldest first
          </p>
        </div>
        {applications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.size === applications.length
                    ? new Set()
                    : new Set(applications.map((a) => a.id)),
                )
              }
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              {selected.size === applications.length ? 'Clear' : 'Select all'}
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || busy !== null}
              onClick={() => void approve([...selected])}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {busy === 'bulk'
                ? 'Approving…'
                : `Approve selected (${selected.size})`}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center text-zinc-400">
          <p className="text-3xl">📋</p>
          <p className="mt-3 text-lg text-white">No pending applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((app) => {
            const wait = waitLabel(app.applied_at);
            const tx = app.payment_transaction_id?.trim().toLowerCase();
            const dupCount = tx ? (duplicates.get(tx)?.size ?? 1) - 1 : 0;
            const group = groups.find((g) => g.id === app.departure_group_id);
            const requested = routes.find(
              (r) => r.id === app.requested_route_id,
            );
            const facts: [string, string | null | undefined][] = [
              ['Type', app.user_type],
              [
                'Institution',
                group
                  ? `${group.university} · ${group.department}`
                  : app.institution,
              ],
              [
                app.user_type === 'faculty' ? 'Employee code' : 'Enrolment no.',
                app.cnic_last4,
              ],
              ['Phone', app.phone],
              [
                'Guardian',
                app.guardian_name
                  ? `${app.guardian_name}${app.guardian_relation ? ` (${app.guardian_relation})` : ''} · ${app.guardian_phone ?? ''}`
                  : null,
              ],
              [
                'Requested route',
                requested
                  ? `${requested.name}${app.wants_ac ? ' · AC' : ''}`
                  : null,
              ],
              [
                'Pickup',
                (app.pickup_point_id && points[app.pickup_point_id]) ||
                  app.pickup_area,
              ],
              [
                'Times',
                [app.preferred_morning, app.preferred_evening]
                  .filter(Boolean)
                  .map((t) => t.slice(0, 5))
                  .join(' / ') || null,
              ],
            ];
            return (
              <article
                key={app.id}
                className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4"
              >
                <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(app.id)}
                      onChange={() => toggle(app.id)}
                      className="mt-1.5 h-4 w-4 accent-yellow-400"
                      aria-label={`Select ${app.full_name}`}
                    />
                    <span>
                      <span className="block text-lg font-semibold text-white">
                        {app.full_name}
                      </span>
                      <span className="block text-sm text-zinc-400">
                        {app.email}
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full bg-zinc-900 px-2.5 py-1 ${wait.tone}`}
                    >
                      ⏱ {wait.text}
                    </span>
                    {app.waitlisted && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-200">
                        Waitlist
                      </span>
                    )}
                    {(app.resubmission_count ?? 0) > 0 && (
                      <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-blue-200">
                        Resubmitted ×{app.resubmission_count}
                      </span>
                    )}
                  </div>
                </header>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      {facts
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="rounded-xl bg-zinc-900/80 px-3 py-2"
                          >
                            <dt className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                              {k}
                            </dt>
                            <dd className="text-zinc-100">{v}</dd>
                          </div>
                        ))}
                    </dl>
                    <div
                      className={`rounded-xl border px-3 py-2 text-sm ${dupCount > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-zinc-800 bg-zinc-900/80'}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Transaction ID · amount due · reference
                      </p>
                      <p className="font-mono text-white">
                        {app.payment_transaction_id} ·{' '}
                        {formatPkr(app.amount_due)} ·{' '}
                        {app.payment_reference ?? '—'}
                      </p>
                      {dupCount > 0 && (
                        <p className="mt-1 text-xs font-semibold text-red-300">
                          ⚠️ This transaction ID is also used on {dupCount}{' '}
                          other account{dupCount > 1 ? 's' : ''}.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {app.payment_proof_url ? (
                      <ProofViewer value={app.payment_proof_url} />
                    ) : (
                      <p className="text-sm text-zinc-500">
                        No proof uploaded.
                      </p>
                    )}
                    {app.student_id_card_path && (
                      <details className="rounded-xl border border-zinc-800 p-2">
                        <summary className="cursor-pointer text-sm text-zinc-300">
                          Student ID card
                        </summary>
                        <div className="mt-2">
                          <ProofViewer
                            value={app.student_id_card_path}
                            label="Student ID card"
                          />
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 lg:grid-cols-2">
                  <div className="flex gap-2">
                    <select
                      value={routeFor(app)}
                      onChange={(e) =>
                        setAssign((p) => ({ ...p, [app.id]: e.target.value }))
                      }
                      aria-label="Assign route"
                      className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white"
                    >
                      <option value="">No route yet</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void approve([app.id])}
                      className="flex-none rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
                    >
                      {busy === app.id ? '…' : 'Approve + assign'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {REJECTION_REASONS.map((r) => (
                        <button
                          key={r.code}
                          type="button"
                          onClick={() =>
                            setReasonCode((p) => ({ ...p, [app.id]: r.code }))
                          }
                          aria-pressed={reasonCode[app.id] === r.code}
                          className={`rounded-full px-2.5 py-1 text-xs ${reasonCode[app.id] === r.code ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={reasonNote[app.id] ?? ''}
                        onChange={(e) =>
                          setReasonNote((p) => ({
                            ...p,
                            [app.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional note to the student"
                        className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        disabled={busy !== null || !reasonCode[app.id]}
                        onClick={() => void reject(app)}
                        className="flex-none rounded-xl border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
