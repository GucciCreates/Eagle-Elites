'use client';

import { useState } from 'react';
import Icon from '@/components/ui/icons';
import type { SupabaseClient } from '@supabase/supabase-js';

export type VehicleCheck = {
  fuel_ok: boolean;
  tyres_ok: boolean;
  lights_ok: boolean;
  brakes_ok: boolean;
  mirrors_horn_ok: boolean;
  all_ok?: boolean;
  notes: string | null;
};

const ITEMS: { key: keyof Omit<VehicleCheck, 'notes' | 'all_ok'>; label: string }[] = [
  { key: 'fuel_ok', label: 'Fuel' },
  { key: 'tyres_ok', label: 'Tyres' },
  { key: 'lights_ok', label: 'Lights & indicators' },
  { key: 'brakes_ok', label: 'Brakes' },
  { key: 'mirrors_horn_ok', label: 'Mirrors & horn' },
];

/** Quick pre-trip check, once a day. A failed item alerts the admin. */
export default function VehicleCheckCard({
  supabase,
  driverId,
  coasterId,
  vehicleNumber,
  date,
  existing,
  onSaved,
}: {
  supabase: SupabaseClient;
  driverId: string;
  coasterId: string | null;
  vehicleNumber: string | null;
  date: string;
  existing: VehicleCheck | null;
  onSaved: (check: VehicleCheck) => void;
}) {
  const [values, setValues] = useState<VehicleCheck>(
    existing ?? { fuel_ok: true, tyres_ok: true, lights_ok: true, brakes_ok: true, mirrors_horn_ok: true, notes: null },
  );
  const [editing, setEditing] = useState(!existing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const problems = ITEMS.filter((item) => !values[item.key]);

  if (!editing && existing) {
    const failed = ITEMS.filter((item) => !existing[item.key]);
    return (
      <section aria-label="Vehicle check" className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-5 ${failed.length ? 'border-red-300/20 bg-red-300/[0.05]' : 'border-emerald-300/15 bg-emerald-300/[0.05]'}`}>
        <div className="flex items-center gap-3">
          <Icon name={failed.length ? 'help' : 'check'} size={22} className={failed.length ? 'text-red-200' : 'text-emerald-200'} />
          <div>
            <p className="font-semibold text-white">{failed.length ? 'Vehicle check: problem reported' : 'Vehicle check done'}</p>
            <p className="text-sm text-zinc-400">{failed.length ? `${failed.map((item) => item.label).join(', ')}. The admin can see this.` : `${vehicleNumber ? `${vehicleNumber} · ` : ''}All items OK today.`}</p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="ee-btn ee-btn-secondary min-h-11">Edit</button>
      </section>
    );
  }

  return (
    <form
      aria-label="Vehicle check"
      className="rounded-3xl border border-white/[0.08] bg-[#10151d] p-5 sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const row = { driver_id: driverId, coaster_id: coasterId, check_date: date, ...values, notes: values.notes?.trim() || null };
        const { error: saveError } = await supabase.from('vehicle_checks').upsert(row, { onConflict: 'driver_id,check_date' });
        setSaving(false);
        if (saveError) {
          setError(/does not exist|schema cache/i.test(saveError.message) ? 'Vehicle checks switch on once the admin applies the latest database update.' : 'Could not save the check. Try again.');
          return;
        }
        onSaved(row);
        setEditing(false);
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/70">Before the first trip</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Vehicle check{vehicleNumber ? ` · ${vehicleNumber}` : ''}</h2>
      <ul className="mt-4 divide-y divide-white/[0.06]">
        {ITEMS.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-zinc-200">{item.label}</span>
            <div role="group" aria-label={item.label} className="flex gap-1.5">
              <button type="button" aria-pressed={values[item.key]} onClick={() => setValues((v) => ({ ...v, [item.key]: true }))} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${values[item.key] ? 'bg-emerald-300 text-[#04170d]' : 'border border-white/10 text-zinc-400'}`}>
                OK
              </button>
              <button type="button" aria-pressed={!values[item.key]} onClick={() => setValues((v) => ({ ...v, [item.key]: false }))} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${!values[item.key] ? 'bg-red-300 text-[#2a0e0e]' : 'border border-white/10 text-zinc-400'}`}>
                Problem
              </button>
            </div>
          </li>
        ))}
      </ul>
      {problems.length > 0 && (
        <label className="mt-3 block text-sm text-zinc-300">
          What&apos;s wrong?
          <textarea value={values.notes ?? ''} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} maxLength={500} rows={2} className="ee-input mt-1.5" />
        </label>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
      <button type="submit" disabled={saving} aria-busy={saving} data-loading={saving ? 'true' : undefined} className="ee-btn ee-btn-primary mt-4 w-full sm:w-auto">
        {problems.length ? 'Save and alert the admin' : 'All OK, save check'}
      </button>
    </form>
  );
}
