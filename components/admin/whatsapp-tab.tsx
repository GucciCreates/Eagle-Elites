'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPkPhone, normalizePkPhone } from '@/lib/phone';
import { notifyWhatsApp } from '@/lib/whatsapp/client';
import { card, ghostBtn, input, label, primaryBtn } from './ui';

type Status = {
  serviceRole: boolean;
  whatsapp: boolean;
  cronSecret: boolean;
  templates: Record<string, string>;
};

type LogRow = {
  id: string;
  event: string;
  phone: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs ${
        ok
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      }`}
    >
      {ok ? '✓' : '!'} {children}
    </span>
  );
}

export default function WhatsAppTab() {
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<Status | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [logError, setLogError] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch('/api/whatsapp/status', {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    }).catch(() => null);
    if (res?.ok) setStatus((await res.json()) as Status);

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('id, event, phone, status, error, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error)
      setLogError(
        `Log unavailable: ${error.message}. Has the whatsapp migration been run?`,
      );
    else setLog((data ?? []) as LogRow[]);
  }, [supabase]);

  useEffect(() => {
    // Async fetch; state is set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const sendTest = async () => {
    setTestResult('');
    if (!normalizePkPhone(testPhone)) {
      setTestResult('Enter a valid Pakistani number, e.g. 0300 1234567.');
      return;
    }
    setTesting(true);
    const result = await notifyWhatsApp({ event: 'test', phone: testPhone });
    setTesting(false);
    setTestResult(
      !result.ok
        ? `Failed: ${result.error ?? 'unknown error'}`
        : result.sent
          ? `Sent to ${formatPkPhone(testPhone)}.`
          : `Not sent${result.error ? `: ${result.error}` : ' (WhatsApp is not configured, see the log below).'}`,
    );
    void load();
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-semibold text-white">WhatsApp alerts</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Opted-in students get WhatsApp messages when their application is
          approved, before fees are due (1st) and on the deadline (10th), when a
          holiday is added, when their vehicle/driver is assigned, and for
          announcements you choose to send.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {status ? (
            <>
              <Pill ok={status.whatsapp}>
                WhatsApp API {status.whatsapp ? 'configured' : 'not configured'}
              </Pill>
              <Pill ok={status.serviceRole}>
                Service role key {status.serviceRole ? 'set' : 'missing'}
              </Pill>
              <Pill ok={status.cronSecret}>
                Cron secret {status.cronSecret ? 'set' : 'missing'}
              </Pill>
            </>
          ) : (
            <span className="text-sm text-zinc-500">
              Checking configuration…
            </span>
          )}
        </div>
        {status && Object.keys(status.templates).length > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Templates:{' '}
            {Object.entries(status.templates)
              .map(([k, v]) => `${k} → ${v}`)
              .join(' · ')}
          </p>
        )}
      </div>

      <div className={`${card} max-w-xl`}>
        <h3 className="font-semibold text-white">Send a test message</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Uses Meta&apos;s sample &quot;hello_world&quot; template.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="wa-test-phone" className={label}>
              Phone number
            </label>
            <input
              id="wa-test-phone"
              type="tel"
              inputMode="tel"
              className={input}
              value={testPhone}
              placeholder="0300 1234567"
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={primaryBtn}
            disabled={testing}
            onClick={sendTest}
          >
            {testing ? 'Sending…' : 'Send test'}
          </button>
        </div>
        {testResult && (
          <p role="status" className="mt-3 text-sm text-zinc-300">
            {testResult}
          </p>
        )}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Recent messages</h3>
          <button
            type="button"
            className={ghostBtn}
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
        {logError ? (
          <p className="mt-3 text-sm text-amber-200">{logError}</p>
        ) : log.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing sent yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="pr-4">Event</th>
                  <th className="pr-4">To</th>
                  <th className="pr-4">Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {log.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-800">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('en-PK', {
                        timeZone: 'Asia/Karachi',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="pr-4">{row.event}</td>
                    <td className="pr-4 whitespace-nowrap">
                      {formatPkPhone(row.phone)}
                    </td>
                    <td
                      className={`pr-4 ${row.status === 'sent' ? 'text-emerald-300' : row.status === 'failed' ? 'text-red-300' : 'text-zinc-500'}`}
                    >
                      {row.status}
                    </td>
                    <td className="text-xs text-zinc-500">{row.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
