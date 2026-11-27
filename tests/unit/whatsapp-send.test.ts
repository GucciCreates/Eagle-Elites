import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendToRecipients, type Recipient } from '@/lib/whatsapp/send';

type Row = { status: string; dedupe_key: string | null; student_id: string | null };

function fakeService(alreadySent: string[]) {
  const logged: Row[] = [];
  let lookups = 0;
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: (_col: string, keys: string[]) => {
      lookups += 1;
      return Promise.resolve({ data: keys.filter((k) => alreadySent.includes(k)).map((k) => ({ dedupe_key: k })) });
    },
    insert: (rows: Row | Row[]) => {
      logged.push(...(Array.isArray(rows) ? rows : [rows]));
      return Promise.resolve({ error: null });
    },
  };
  const service = { from: () => builder } as unknown as SupabaseClient;
  return { service, logged, lookups: () => lookups };
}

describe('WhatsApp bulk sending', () => {
  let inFlight = 0;
  let peak = 0;
  let calls = 0;

  beforeEach(() => {
    vi.stubEnv('WHATSAPP_TOKEN', 'token');
    vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', 'phone-id');
    inFlight = 0;
    peak = 0;
    calls = 0;
    vi.stubGlobal('fetch', async () => {
      const n = ++calls;
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      const ok = n !== 3; // the third message fails
      return {
        ok,
        status: ok ? 200 : 400,
        json: async () => (ok ? { messages: [{ id: `m${n}` }] } : { error: { message: 'bad number' } }),
      };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('dedupes, limits concurrency and logs every attempt', async () => {
    const recipients: Recipient[] = [
      ...Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, phone: `0300123${String(i).padStart(4, '0')}` })),
      { id: 'dup', phone: '03001230000' }, // same key as s0 → skipped in this run
      { id: 'old', phone: '03009999999' }, // delivered in an earlier run → skipped
      { id: 'nophone', phone: null }, // no phone → skipped but logged
    ];
    const key = (r: Recipient) => (r.id === 'dup' ? 'k-s0' : r.id === 'old' ? 'k-old' : `k-${r.id}`);
    const { service, logged, lookups } = fakeService(['k-old']);

    const summary = await sendToRecipients(service, 'announcement', recipients, () => ['Title', 'Body'], key);

    expect(summary).toEqual({ sent: 19, failed: 1, skipped: 3 });
    expect(calls).toBe(20);
    expect(peak).toBeLessThanOrEqual(5);
    expect(lookups()).toBe(1);
    expect(logged).toHaveLength(21); // 20 sends + the one without a phone
    // A failed send keeps no dedupe key, so it can be retried later.
    expect(logged.filter((r) => r.status === 'failed').every((r) => r.dedupe_key === null)).toBe(true);
    expect(logged.filter((r) => r.status === 'sent').every((r) => r.dedupe_key)).toBe(true);
  });

  it('skips everyone when WhatsApp is not configured', async () => {
    vi.stubEnv('WHATSAPP_TOKEN', '');
    const { service } = fakeService([]);
    const summary = await sendToRecipients(service, 'announcement', [{ id: 'a', phone: '03001234567' }], () => []);
    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(calls).toBe(0);
  });
});
