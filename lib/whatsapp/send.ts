// Server-only: sends WhatsApp template messages and logs every attempt.
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePkPhone } from '@/lib/phone';
import {
  getTemplateName,
  getWhatsAppConfig,
  type WhatsAppEvent,
} from './config';

export type SendResult = {
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  messageId?: string;
};

/** Meta rejects newlines/tabs and 4+ spaces inside template params. */
function cleanParam(value: string) {
  return value
    .replace(/[\n\t]+/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim()
    .slice(0, 1000);
}

export async function sendTemplate(
  phone: string,
  event: WhatsAppEvent,
  params: string[],
): Promise<SendResult> {
  const config = getWhatsAppConfig();
  if (!config.configured) {
    console.info(
      `[whatsapp] skipped ${event}: WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set`,
    );
    return { status: 'skipped', error: 'WhatsApp is not configured' };
  }

  const to = normalizePkPhone(phone);
  if (!to) return { status: 'skipped', error: 'Invalid phone number' };

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: getTemplateName(event),
      language: { code: event === 'test' ? 'en_US' : config.language },
      ...(params.length > 0 && {
        components: [
          {
            type: 'body',
            parameters: params.map((text) => ({
              type: 'text',
              text: cleanParam(text) || '-',
            })),
          },
        ],
      }),
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        status: 'failed',
        error: json.error?.message || `HTTP ${res.status}`,
      };
    }
    return { status: 'sent', messageId: json.messages?.[0]?.id };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export type Recipient = {
  id: string | null;
  phone: string | null;
  full_name?: string | null;
};

const SEND_CONCURRENCY = 5;
const LOG_BATCH = 25;
const LOOKUP_BATCH = 200;

type LogRow = {
  student_id: string | null;
  phone: string | null;
  event: WhatsAppEvent;
  template: string;
  status: SendResult['status'];
  error: string | null;
  provider_message_id: string | null;
  dedupe_key: string | null;
};

/** Keys that were already delivered, looked up in a few batched queries. */
async function alreadySent(service: SupabaseClient, keys: string[]) {
  const sent = new Set<string>();
  for (let i = 0; i < keys.length; i += LOOKUP_BATCH) {
    const { data } = await service
      .from('whatsapp_messages')
      .select('dedupe_key')
      .eq('status', 'sent')
      .in('dedupe_key', keys.slice(i, i + LOOKUP_BATCH));
    for (const row of data ?? []) if (row.dedupe_key) sent.add(row.dedupe_key as string);
  }
  return sent;
}

async function writeLog(service: SupabaseClient, rows: LogRow[]) {
  if (rows.length === 0) return;
  const { error } = await service.from('whatsapp_messages').insert(rows);
  if (!error) return;
  // A duplicate "sent" key (unique index) rejects the whole batch: retry
  // row by row so the other attempts are still recorded.
  for (const row of rows) {
    await service.from('whatsapp_messages').insert(row);
  }
}

/**
 * Sends one event to many recipients, logging each attempt to
 * `whatsapp_messages`. `dedupeKey` (per recipient) skips repeats.
 * Duplicate checks are batched and messages go out a few at a time, so large
 * audiences finish well inside the serverless time limit.
 */
export async function sendToRecipients(
  service: SupabaseClient | null,
  event: WhatsAppEvent,
  recipients: Recipient[],
  buildParams: (recipient: Recipient) => string[],
  dedupeKey?: (recipient: Recipient) => string,
) {
  const summary = { sent: 0, failed: 0, skipped: 0 };
  const template = getTemplateName(event);

  const keyed = recipients.map((recipient) => ({ recipient, key: dedupeKey?.(recipient) ?? null }));
  const keys = [...new Set(keyed.map((item) => item.key).filter((key): key is string => Boolean(key)))];
  const sent = service && keys.length ? await alreadySent(service, keys) : new Set<string>();

  // Skip already-delivered keys and duplicates within this same run.
  const seen = new Set<string>();
  const queue = keyed.filter(({ key }) => {
    if (!key) return true;
    if (sent.has(key) || seen.has(key)) {
      summary.skipped += 1;
      return false;
    }
    seen.add(key);
    return true;
  });

  let pending: LogRow[] = [];
  const flush = async () => {
    if (!service) return;
    const rows = pending;
    pending = [];
    await writeLog(service, rows);
  };

  let next = 0;
  const worker = async () => {
    while (next < queue.length) {
      const { recipient, key } = queue[next++];
      const result = recipient.phone
        ? await sendTemplate(recipient.phone, event, buildParams(recipient))
        : ({ status: 'skipped', error: 'No phone number' } as SendResult);
      summary[result.status] += 1;
      pending.push({
        student_id: recipient.id,
        phone: normalizePkPhone(recipient.phone) ?? recipient.phone,
        event,
        template,
        status: result.status,
        error: result.error ?? null,
        provider_message_id: result.messageId ?? null,
        dedupe_key: result.status === 'sent' ? key : null,
      });
      if (pending.length >= LOG_BATCH) await flush();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(SEND_CONCURRENCY, queue.length) }, worker),
  );
  await flush();

  return summary;
}
