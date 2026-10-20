'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_PAYMENT_SETTINGS,
  fetchPaymentSettings,
  isValidPkIban,
  type PaymentSettings,
} from '@/lib/settings/payment';
import { card, input, label, primaryBtn } from './ui';

export default function PaymentSettingsTab() {
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'ok' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    void fetchPaymentSettings(supabase).then((settings) => {
      setForm(settings);
      setLoading(false);
    });
  }, [supabase]);

  const save = async () => {
    setMessage(null);
    const iban = form.iban.replace(/\s/g, '').toUpperCase();
    if (!form.bank_name.trim() || !form.account_title.trim()) {
      setMessage({
        tone: 'error',
        text: 'Bank name and account title are required.',
      });
      return;
    }
    if (!isValidPkIban(iban)) {
      setMessage({
        tone: 'error',
        text: 'Enter a valid Pakistani IBAN (PK + 22 characters).',
      });
      return;
    }

    setSaving(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error } = await supabase.from('app_settings').upsert({
      key: 'payment',
      value: {
        bank_name: form.bank_name.trim(),
        account_title: form.account_title.trim(),
        account_number: form.account_number.replace(/\s/g, ''),
        iban,
        instructions: form.instructions?.trim() ?? '',
      },
      updated_at: new Date().toISOString(),
      updated_by: session?.user.id ?? null,
    });
    setSaving(false);

    if (error) {
      setMessage({
        tone: 'error',
        text: `Couldn't save: ${error.message}. Has the app_settings migration been run?`,
      });
      return;
    }
    setForm((prev) => ({ ...prev, iban }));
    setMessage({
      tone: 'ok',
      text: 'Payment details saved. Students will see them on the payment step.',
    });
  };

  return (
    <div className={`${card} max-w-2xl`}>
      <h2 className="text-lg font-semibold text-white">Payment details</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Shown to students on the onboarding payment step.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="bank-name" className={label}>
              Bank name
            </label>
            <input
              id="bank-name"
              className={input}
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="account-title" className={label}>
              Account title
            </label>
            <input
              id="account-title"
              className={input}
              value={form.account_title}
              onChange={(e) =>
                setForm({ ...form, account_title: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="account-number" className={label}>
              Account number
            </label>
            <input
              id="account-number"
              className={`${input} font-mono`}
              value={form.account_number}
              inputMode="numeric"
              spellCheck={false}
              onChange={(e) =>
                setForm({ ...form, account_number: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="iban" className={label}>
              IBAN
            </label>
            <input
              id="iban"
              className={`${input} font-mono`}
              value={form.iban}
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => setForm({ ...form, iban: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="instructions" className={label}>
              Extra instructions (optional)
            </label>
            <textarea
              id="instructions"
              rows={3}
              className={input}
              value={form.instructions ?? ''}
              placeholder="e.g. Add your full name in the transfer reference."
              onChange={(e) =>
                setForm({ ...form, instructions: e.target.value })
              }
            />
          </div>

          {message && (
            <p
              role={message.tone === 'error' ? 'alert' : 'status'}
              className={`text-sm ${message.tone === 'error' ? 'text-red-300' : 'text-emerald-300'}`}
            >
              {message.text}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={primaryBtn}
          >
            {saving ? 'Saving…' : 'Save payment details'}
          </button>
        </div>
      )}
    </div>
  );
}
