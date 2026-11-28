import { NextResponse } from 'next/server';
import {
  createServiceClient,
  getAdminFromRequest,
} from '@/lib/supabase/service';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendToRecipients, type Recipient } from '@/lib/whatsapp/send';
import { apiError, isIsoDate, isUuid, text } from '@/lib/api/validate';
import { normalizePkPhone } from '@/lib/phone';
import { notifyAssignments } from '@/lib/whatsapp/assignment';

type Body =
  | { event: 'approval'; studentId: string }
  | { event: 'rejection'; studentId: string }
  | { event: 'holiday'; date: string; reason: string }
  | { event: 'assignment'; date: string; studentIds: string[] }
  | { event: 'announcement'; title: string; message: string; targetType?: string; targetValue?: string | null }
  | { event: 'announcement_students'; title: string; message: string; studentIds: string[] }
  | { event: 'test'; phone: string };

const MAX_TITLE = 120;
const MAX_MESSAGE = 1000;

/** Returns an error message when the payload is malformed, else null. */
function validate(body: Body): string | null {
  switch (body.event) {
    case 'approval':
    case 'rejection':
      return isUuid(body.studentId) ? null : 'A valid student is required.';
    case 'holiday':
      if (!isIsoDate(body.date)) return 'A valid date (YYYY-MM-DD) is required.';
      return text(body.reason, { max: 200 }) ? null : 'A reason of up to 200 characters is required.';
    case 'assignment':
      if (!isIsoDate(body.date)) return 'A valid date (YYYY-MM-DD) is required.';
      return Array.isArray(body.studentIds) && body.studentIds.every(isUuid) ? null : 'Student IDs are invalid.';
    case 'announcement':
      if (!text(body.title, { max: MAX_TITLE }) || !text(body.message, { max: MAX_MESSAGE })) {
        return `Title (up to ${MAX_TITLE} characters) and message (up to ${MAX_MESSAGE}) are required.`;
      }
      return body.targetValue == null || text(body.targetValue, { max: 120 }) ? null : 'The audience value is invalid.';
    case 'announcement_students':
      if (!text(body.title, { max: MAX_TITLE }) || !text(body.message, { max: MAX_MESSAGE })) {
        return `Title (up to ${MAX_TITLE} characters) and message (up to ${MAX_MESSAGE}) are required.`;
      }
      return Array.isArray(body.studentIds) && body.studentIds.length > 0 && body.studentIds.every(isUuid)
        ? null
        : 'Choose at least one valid student.';
    case 'test':
      return typeof body.phone === 'string' && normalizePkPhone(body.phone) ? null : 'Enter a valid Pakistani mobile number.';
    default:
      return 'Unknown event';
  }
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00+05:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Karachi',
  });
}

export async function POST(request: Request) {
  const service = createServiceClient();
  if (!service) {
    console.info('[whatsapp] skipped: SUPABASE_SERVICE_ROLE_KEY not set');
    return NextResponse.json({
      ok: true,
      configured: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY',
    });
  }

  const adminId = await getAdminFromRequest(request, service);
  if (!adminId) {
    return apiError(401, 'Unauthorized');
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return apiError(400, 'Invalid JSON');
  }
  if (!body || typeof body !== 'object') return apiError(400, 'Invalid request body.');
  const invalid = validate(body);
  if (invalid) return apiError(400, invalid);

  const { configured } = getWhatsAppConfig();
  const optedIn = () =>
    service
      .from('profiles')
      .select('id, phone, full_name')
      .eq('role', 'student')
      .eq('status', 'active')
      .eq('whatsapp_opt_in', true);

  let summary;

  switch (body.event) {
    case 'test': {
      if (!body.phone) {
        return NextResponse.json(
          { ok: false, error: 'Phone is required' },
          { status: 400 },
        );
      }
      summary = await sendToRecipients(
        service,
        'test',
        [{ id: null, phone: body.phone }],
        () => [],
      );
      break;
    }

    case 'approval': {
      const { data } = await service
        .from('profiles')
        .select('id, phone, full_name, whatsapp_opt_in')
        .eq('id', body.studentId)
        .maybeSingle();
      const recipients = data?.whatsapp_opt_in ? [data as Recipient] : [];
      summary = await sendToRecipients(
        service,
        'approval',
        recipients,
        (r) => [r.full_name || 'Student'],
        (r) => `approval:${r.id}`,
      );
      break;
    }

    case 'rejection': {
      // Email: no transactional provider is configured (Supabase Auth only
      // sends auth emails), so rejection is WhatsApp + log only.
      const { data } = await service
        .from('profiles')
        .select('id, phone, full_name, whatsapp_opt_in, rejected_reason')
        .eq('id', body.studentId)
        .maybeSingle();
      const recipients = data?.whatsapp_opt_in ? [data as Recipient] : [];
      const reason =
        (data?.rejected_reason as string | null) ||
        'Please check your application.';
      summary = await sendToRecipients(
        service,
        'rejection',
        recipients,
        (r) => [r.full_name || 'Student', reason.slice(0, 200)],
        (r) => `rejection:${r.id}:${Date.now()}`,
      );
      break;
    }

    case 'holiday': {
      const { data } = await optedIn();
      summary = await sendToRecipients(
        service,
        'holiday',
        (data ?? []) as Recipient[],
        () => [formatDate(body.date), body.reason],
        (r) => `holiday:${body.date}:${r.id}`,
      );
      break;
    }

    case 'announcement': {
      if (!body.title || !body.message) {
        return NextResponse.json(
          { ok: false, error: 'Title and message are required' },
          { status: 400 },
        );
      }
      const validTargets = ['all', 'university', 'departure_group', 'unpaid', 'faculty'];
      const targetType = body.targetType ?? 'all';
      if (!validTargets.includes(targetType)) {
        return NextResponse.json(
          { ok: false, error: 'Invalid announcement audience' },
          { status: 400 },
        );
      }
      if (['university', 'departure_group'].includes(targetType) && !body.targetValue) {
        return NextResponse.json(
          { ok: false, error: 'The selected audience requires a target value' },
          { status: 400 },
        );
      }
      let recipientsQuery = service
        .from('profiles')
        .select('id, phone, full_name')
        .eq('role', 'student')
        .eq('status', 'active')
        .eq('whatsapp_opt_in', true);
      if (targetType === 'university') recipientsQuery = recipientsQuery.eq('institution', body.targetValue!);
      if (targetType === 'departure_group') recipientsQuery = recipientsQuery.eq('departure_group_id', body.targetValue!);
      if (targetType === 'unpaid') recipientsQuery = recipientsQuery.neq('fee_status', 'paid');
      if (targetType === 'faculty') recipientsQuery = recipientsQuery.eq('user_type', 'faculty');
      const { data } = await recipientsQuery;
      summary = await sendToRecipients(
        service,
        'announcement',
        (data ?? []) as Recipient[],
        () => [body.title, body.message],
      );
      break;
    }

    case 'announcement_students': {
      const ids = Array.isArray(body.studentIds) ? [...new Set(body.studentIds)].slice(0, 1000) : [];
      if (!body.title || !body.message || ids.length === 0) {
        return NextResponse.json({ ok: false, error: 'Choose students and provide a reminder message.' }, { status: 400 });
      }
      const { data } = await service.from('profiles')
        .select('id, phone, full_name')
        .eq('role', 'student').eq('status', 'active').eq('whatsapp_opt_in', true).in('id', ids);
      summary = await sendToRecipients(service, 'announcement', (data ?? []) as Recipient[], () => [body.title, body.message]);
      break;
    }

    case 'assignment': {
      const ids = Array.isArray(body.studentIds) ? body.studentIds : [];
      summary = await notifyAssignments(service, body.date, ids);
      break;
    }

    default:
      return NextResponse.json(
        { ok: false, error: 'Unknown event' },
        { status: 400 },
      );
  }

  return NextResponse.json({ ok: true, configured, ...summary });
}
