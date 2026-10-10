'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingPayment() {
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!proofFile) {
      setError('Please upload your payment proof screenshot.');
      return;
    }

    if (!transactionId.trim()) {
      setError('Please enter your transaction ID.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/auth/login');
        return;
      }

      const fileExt = proofFile.name.split('.').pop() ?? 'png';
      const filePath = `${session.user.id}/payment-proof.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, proofFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          payment_transaction_id: transactionId,
          payment_proof_url: urlData.publicUrl,
          status: 'pending',
          applied_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      router.push('/onboarding/pending');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit payment proof',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1018]/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.2),_transparent_30%),linear-gradient(135deg,_rgba(17,24,39,0.95),_rgba(10,13,20,0.98))] p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="relative">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-xl font-black text-black shadow-[0_18px_40px_rgba(250,204,21,0.45)]">
                EE
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-yellow-300/80">
                Eagle Elites
              </p>
              <h1 className="mt-5 max-w-xs text-4xl font-black leading-tight text-white">
                Verify your payment.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-300">
                Complete the final step by sending proof of transfer so admin
                can approve your account.
              </p>
            </div>

            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                Payment instructions
              </p>
              <div className="mt-4 space-y-3 text-sm text-zinc-200">
                {[
                  { label: 'Bank', value: 'Meezan Bank' },
                  {
                    label: 'Account Title',
                    value: 'Eagles Elite Transport Service & Tour Planners',
                  },
                  { label: 'A/C No', value: '98370114507755' },
                  { label: 'IBAN', value: 'PK31MEZN0098370114507755' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between gap-4">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full p-6 sm:p-8 lg:p-10">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-300/80">
                Onboarding
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Payment Verification
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Step 3 of 3 — Submit your payment proof
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0f1724]/80 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:p-6">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                  <span className="text-base">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="transactionId"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Transaction ID / Reference Number
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      🔢
                    </span>
                    <input
                      id="transactionId"
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/80 pl-10 pr-4 py-3.5 text-white placeholder-zinc-500 focus:border-yellow-400/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
                      placeholder="e.g. TXN-20261001-00123"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="proof-upload"
                    className="mb-2 block text-sm font-medium text-zinc-300"
                  >
                    Payment Screenshot
                  </label>

                  <label
                    htmlFor="proof-upload"
                    className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/80 px-4 py-6 text-center transition hover:border-yellow-400/70 hover:bg-zinc-900"
                  >
                    {proofPreview ? (
                      <div className="space-y-3">
                        <Image
                          src={proofPreview}
                          alt="Payment proof preview"
                          width={800}
                          height={500}
                          unoptimized
                          className="max-h-52 w-full rounded-xl object-contain"
                        />
                        <span className="text-sm font-medium text-yellow-300">
                          ✓ Screenshot uploaded — tap to change
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-3xl">📸</span>
                        <div>
                          <p className="text-sm font-medium text-white">
                            Tap to upload payment screenshot
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            JPG, PNG or screenshot from your banking app
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      id="proof-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                  💡 Fee amount depends on your route. Admin will confirm the
                  exact amount after reviewing your application.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-4 py-3.5 font-semibold text-black shadow-[0_14px_30px_rgba(250,204,21,0.35)] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 text-center text-xs text-zinc-600">
              Eagle Elites Transport © 2026 · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
