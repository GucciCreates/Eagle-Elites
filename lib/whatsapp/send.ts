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

/**
 * Sends one event to many recipients, logging each attempt to
 * `whatsapp_messages`. `dedupeKey` (per recipient) skips repeats.
 */
export async function sendToRecipients(
  service: SupabaseClient | null,
  event: WhatsAppEvent,
  recipients: Recipient[],
  buildParams: (recipient: Recipient) => string[],
  dedupeKey?: (recipient: Recipient) => string,
) {
  const summary = { sent: 0, failed: 0, skipped: 0 };

  for (const recipient of recipients) {
    const key = dedupeKey?.(recipient);

    if (key && service) {
      const { data: existing } = await service
        .from('whatsapp_messages')
        .select('id')
        .eq('dedupe_key', key)
        .eq('status', 'sent')
        .maybeSingle();
      if (existing) {
        summary.skipped += 1;
        continue;
      }
    }

    const result = recipient.phone
      ? await sendTemplate(recipient.phone, event, buildParams(recipient))
      : ({ status: 'skipped', error: 'No phone number' } as SendResult);

    summary[result.status] += 1;

    if (service) {
      await service.from('whatsapp_messages').insert({
        student_id: recipient.id,
        phone: normalizePkPhone(recipient.phone) ?? recipient.phone,
        event,
        template: getTemplateName(event),
        status: result.status,
        error: result.error ?? null,
        provider_message_id: result.messageId ?? null,
        dedupe_key: result.status === 'sent' ? (key ?? null) : null,
      });
    }
  }

  return summary;
}
