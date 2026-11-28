'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_OPERATIONS_SETTINGS, fetchOperationsSettings, type OperationsSettings } from '@/lib/settings/operations';
import { card, input, label } from './ui';

/** Skip cutoff, nightly auto-publish and trip WhatsApp toggles. */
export default function OperationsSettingsCard({ canEdit }: { canEdit: boolean }) {
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState<OperationsSettings>(DEFAULT_OPERATIONS_SETTINGS);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void fetchOperationsSettings(supabase).then((settings) => {
      if (settings) setForm(settings);
      else setAvailable(false);
      setLoading(false);
    });
  }, [supabase]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('app_settings').upsert({ key: 'operations', value: form, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaving(false);
    setMessage(error ? { tone: 'error', text: 'Could not save. Try again.' } : { tone: 'ok', text: 'Operations settings saved.' });
  };

  const toggle = (key: 'auto_plan' | 'trip_whatsapp', title: string, hint: string) => (
    <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <input type="checkbox" checked={form[key]} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-5 w-5 accent-yellow-400" />
      <span>
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block text-xs text-zinc-400">{hint}</span>
      </span>
    </label>
  );

  return (
    <section className={card} aria-labelledby="ops-settings-title">
      <h2 id="ops-settings-title" className="text-xl font-semibold text-white">Daily operations</h2>
      <p className="mt-1 text-sm text-zinc-400">How tomorrow gets planned and what riders hear from drivers.</p>
      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : !available ? (
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3 text-sm text-amber-100">These settings appear once the admin-operations database update is applied.</p>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block max-w-xs">
            <span className={label}>&ldquo;Not riding&rdquo; closes for tomorrow at (Pakistan time)</span>
            <input type="time" value={form.skip_cutoff} disabled={!canEdit} onChange={(event) => setForm((current) => ({ ...current, skip_cutoff: event.target.value }))} className={input} />
          </label>
          {toggle('auto_plan', 'Publish tomorrow’s trips automatically', 'Runs each evening at about 9:30 PM. Trips you set by hand are kept.')}
          {toggle('trip_whatsapp', 'WhatsApp riders when the driver updates a trip', '“On the way”, “arriving” and delay messages. Each message is a paid WhatsApp conversation.')}
          {canEdit ? (
            <button type="button" onClick={() => void save()} disabled={saving} aria-busy={saving} data-loading={saving ? 'true' : undefined} className="ee-btn ee-btn-primary">
              Save
            </button>
          ) : (
            <p className="text-xs text-zinc-500">Only owners and operations staff can change these.</p>
          )}
          {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-red-200' : 'text-emerald-200'}`}>{message.text}</p>}
        </div>
      )}
    </section>
  );
}
