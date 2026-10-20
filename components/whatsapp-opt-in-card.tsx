'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPkPhone, normalizePkPhone } from '@/lib/phone';

type Props = {
  profileId: string;
  phone: string | null | undefined;
  optIn: boolean | null | undefined;
  demo?: boolean;
};

/** Student control for WhatsApp alerts + the number they go to. */
export default function WhatsAppOptInCard({
  profileId,
  phone,
  optIn,
  demo,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [enabled, setEnabled] = useState(Boolean(optIn));
  const [number, setNumber] = useState(phone ? formatPkPhone(phone) : '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const save = async (nextEnabled: boolean) => {
    setMessage(null);
    const normalized = normalizePkPhone(number);
    if (nextEnabled && !normalized) {
      setMessage({
        ok: false,
        text: 'Enter a valid Pakistani number, e.g. 0300 1234567.',
      });
      return;
    }
    if (demo) {
      setEnabled(nextEnabled);
      setMessage({ ok: true, text: 'Saved (demo mode).' });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        whatsapp_opt_in: nextEnabled,
        ...(normalized && { phone: `+${normalized}` }),
      })
      .eq('id', profileId);
    setSaving(false);

    if (error) {
      setMessage({
        ok: false,
        text: 'Couldn’t save right now. Please try again later.',
      });
      return;
    }
    setEnabled(nextEnabled);
    if (normalized) setNumber(formatPkPhone(normalized));
    setMessage({
      ok: true,
      text: nextEnabled
        ? 'WhatsApp updates are on.'
        : 'WhatsApp updates are off.',
    });
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#0d131c] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">WhatsApp updates</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Approval, fee reminders, holidays and vehicle/driver changes.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="WhatsApp updates"
          disabled={saving}
          onClick={() => save(!enabled)}
          className={`relative h-7 w-12 flex-none rounded-full border transition ${
            enabled
              ? 'border-emerald-400/50 bg-emerald-500/70'
              : 'border-zinc-600 bg-zinc-800'
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${
              enabled ? 'left-6' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="wa-phone"
            className="mb-1.5 block text-xs font-medium text-zinc-400"
          >
            WhatsApp number
          </label>
          <input
            id="wa-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="0300 1234567"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => save(enabled)}
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save number'}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
