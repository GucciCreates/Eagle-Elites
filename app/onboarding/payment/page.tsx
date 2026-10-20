'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthShell from '@/components/auth/auth-shell';
import { Alert, Field, SubmitButton } from '@/components/auth/form-ui';
import Stepper from '@/components/onboarding/stepper';
import CopyButton from '@/components/onboarding/copy-button';
import FilePicker from '@/components/onboarding/file-picker';
import {
  DEFAULT_PAYMENT_SETTINGS,
  fetchPaymentSettings,
  type PaymentSettings,
} from '@/lib/settings/payment';
import { formatPkr, RESERVATION_FEE } from '@/lib/onboarding/pricing';
import { clearDraft, loadDraft, useSaveDraft } from '@/lib/onboarding/draft';
import { friendlyOnboardingError } from '@/lib/onboarding/errors';
import { uploadPath } from '@/lib/upload/compress';

type Profile = {
  status: string;
  amount_due: number | null;
  payment_reference: string | null;
  payment_transaction_id: string | null;
  payment_proof_url: string | null;
  waitlisted?: boolean;
  routes?: { name: string } | null;
  requested_route_id: string | null;
  wants_ac: boolean;
};

const METHODS = [
  {
    key: 'bank',
    label: 'Bank app',
    steps: [
      'Open your bank app and choose “Transfer to IBAN”.',
      'Paste the IBAN below and enter the exact amount.',
      'Put your reference code in the purpose / remarks field.',
    ],
  },
  {
    key: 'raast',
    label: 'Raast',
    steps: [
      'In any bank app, choose Raast → “Pay to IBAN”.',
      'Paste the IBAN below. Raast transfers arrive instantly and are free.',
      'Add your reference code in the note.',
    ],
  },
  {
    key: 'easypaisa',
    label: 'Easypaisa',
    steps: [
      'Open Easypaisa → Send Money → Bank Transfer.',
      'Select the bank below and paste the IBAN / account number.',
      'Enter the exact amount and your reference code in the note.',
    ],
  },
  {
    key: 'jazzcash',
    label: 'JazzCash',
    steps: [
      'Open JazzCash → Money Transfer → Bank Account.',
      'Select the bank below and paste the IBAN / account number.',
      'Enter the exact amount and your reference code in the note.',
    ],
  },
];

export default function OnboardingPayment() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<PaymentSettings>(
    DEFAULT_PAYMENT_SETTINGS,
  );
  const [method, setMethod] = useState('bank');
  const [transactionId, setTransactionId] = useState('');
  const [txError, setTxError] = useState<string>();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useSaveDraft(
    userId ? `payment:${userId}` : null,
    { transactionId, method },
    Boolean(userId),
  );

  useEffect(() => {
    void fetchPaymentSettings(supabase).then(setSettings);
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select(
          'status, amount_due, payment_reference, payment_transaction_id, payment_proof_url, waitlisted, requested_route_id, wants_ac, routes!profiles_requested_route_id_fkey(name)',
        )
        .eq('id', session.user.id)
        .maybeSingle();
      if (data && data.status !== 'payment_pending') {
        router.push(
          data.status === 'incomplete' || data.status === 'rejected'
            ? '/onboarding/profile'
            : data.status === 'active'
              ? '/dashboard'
              : '/onboarding/pending',
        );
        return;
      }
      const p = data as unknown as Profile | null;
      setProfile(p);
      const draft = loadDraft<{ transactionId: string; method: string }>(
        `payment:${session.user.id}`,
      );
      setTransactionId(draft?.transactionId ?? p?.payment_transaction_id ?? '');
      if (draft?.method) setMethod(draft.method);
      setUserId(session.user.id);
    };
    void init();
  }, [router, supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const tx = transactionId.trim();
    if (tx.length < 4) {
      setTxError(
        'Enter the transaction / reference ID from your receipt (at least 4 characters).',
      );
      return;
    }
    if (!proofFile && !profile?.payment_proof_url) {
      setError('Please add a screenshot or PDF of your payment receipt.');
      return;
    }
    if (!userId) return;
    setLoading(true);
    try {
      let proofPath = profile?.payment_proof_url ?? null;
      if (proofFile) {
        // Unique name per upload: the bucket allows inserts only, so this
        // also makes "replace" and resubmission work.
        const path = uploadPath(userId, 'payment-proof', proofFile);
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(path, proofFile, { contentType: proofFile.type });
        if (uploadError) throw uploadError;
        proofPath = path;
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          payment_transaction_id: tx,
          payment_proof_url: proofPath,
          status: 'pending',
        })
        .eq('id', userId);
      if (updateError) throw updateError;
      clearDraft(`payment:${userId}`);
      router.push('/onboarding/pending');
    } catch (err) {
      setError(
        friendlyOnboardingError(
          err,
          'We couldn’t submit your payment. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const reference = profile?.payment_reference ?? '';
  const amount = profile?.amount_due ?? null;
  const rows = [
    { label: 'Bank', value: settings.bank_name, copy: false },
    { label: 'Account title', value: settings.account_title, copy: true },
    ...(settings.account_number
      ? [{ label: 'Account no.', value: settings.account_number, copy: true }]
      : []),
    { label: 'IBAN', value: settings.iban, copy: true },
  ];
  const steps = METHODS.find((m) => m.key === method)?.steps ?? [];

  return (
    <AuthShell
      wide
      eyebrow="Onboarding"
      title="Pay and upload proof"
      subtitle="Transfer the exact amount, then upload your receipt."
      top={<Stepper current={4} />}
    >
      {error && <Alert tone="error">{error}</Alert>}

      {!profile ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-900" />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Amount due
                </p>
                <p className="mt-1 text-3xl font-black text-yellow-300">
                  {formatPkr(amount)}
                </p>
              </div>
              {amount != null && (
                <CopyButton value={String(amount)} label="amount" />
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {profile.routes?.name
                ? `${profile.routes.name}${profile.wants_ac ? ' · AC' : ''} · `
                : ''}
              first month + {formatPkr(RESERVATION_FEE)} seat reservation
            </p>
            {amount == null && (
              <p className="mt-2 text-xs text-amber-200">
                No route selected yet.{' '}
                <Link href="/onboarding/profile" className="underline">
                  Choose your route
                </Link>{' '}
                to see the exact amount.
              </p>
            )}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-black/30 px-3 py-2.5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  Your reference code
                </p>
                <p className="font-mono text-lg font-bold tracking-wider text-white">
                  {reference}
                </p>
              </div>
              {reference && (
                <CopyButton value={reference} label="reference code" />
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Add this code in the transfer note so we can match your payment
              fast.
            </p>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium text-zinc-300">Pay to</p>
            <dl className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950/60">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      {row.label}
                    </dt>
                    <dd className="break-all font-mono text-sm text-white">
                      {row.value}
                    </dd>
                  </div>
                  {row.copy && (
                    <CopyButton value={row.value} label={row.label} />
                  )}
                </div>
              ))}
            </dl>
          </section>

          <section>
            <p className="mb-2 text-sm font-medium text-zinc-300">How to pay</p>
            <div className="mb-3 flex gap-1.5 overflow-x-auto" role="tablist">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={method === m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex-none rounded-lg px-3 py-1.5 text-sm ${method === m.key ? 'bg-yellow-400 font-semibold text-black' : 'bg-zinc-900 text-zinc-300'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-300">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5 border-t border-zinc-800 pt-5"
          >
            <Field
              id="transactionId"
              label="Transaction / reference ID"
              value={transactionId}
              autoComplete="off"
              onChange={(e) => {
                setTransactionId(e.target.value);
                setTxError(undefined);
              }}
              error={txError}
              placeholder="e.g. 0123456789"
              hint="Printed on your receipt or SMS."
            />
            <FilePicker
              label="Payment receipt"
              file={proofFile}
              onChange={setProofFile}
              onError={setError}
              existingLabel={
                profile.payment_proof_url ? 'already uploaded' : null
              }
              hint="Screenshot or PDF. Large photos are compressed automatically."
            />
            <SubmitButton loading={loading} loadingText="Submitting…">
              Submit for review
            </SubmitButton>
            <div className="flex justify-between text-xs">
              <Link
                href="/onboarding/profile"
                className="text-zinc-400 hover:text-white"
              >
                ← Edit route or details
              </Link>
              <span className="text-zinc-500">
                Progress saved on this device
              </span>
            </div>
          </form>

          <section className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400 sm:grid-cols-3">
            <p>
              🏦 Payments go only to the registered account{' '}
              <span className="text-zinc-200">{settings.account_title}</span>.
              We never ask you to pay a personal number.
            </p>
            <p>
              🔒 Your receipt and ID are stored privately and visible only to
              our admin team.
            </p>
            <p>
              💬 Questions?{' '}
              <a
                href="https://wa.me/923225166580"
                target="_blank"
                rel="noreferrer"
                className="text-yellow-300"
              >
                WhatsApp us
              </a>
              . We reply quickly 7 days a week.
            </p>
          </section>
        </div>
      )}
    </AuthShell>
  );
}
