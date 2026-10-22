import { NextResponse } from 'next/server';
import {
  createServiceClient,
  getAdminFromRequest,
} from '@/lib/supabase/service';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendToRecipients, type Recipient } from '@/lib/whatsapp/send';

type Body =
  | { event: 'approval'; studentId: string }
  | { event: 'rejection'; studentId: string }
  | { event: 'holiday'; date: string; reason: string }
  | { event: 'assignment'; date: string; studentIds: string[] }
  | { event: 'announcement'; title: string; message: string; targetType?: string; targetValue?: string | null }
  | { event: 'announcement_students'; title: string; message: string; studentIds: string[] }
  | { event: 'test'; phone: string };

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
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

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
      const ids = Array.isArray(body.studentIds)
        ? body.studentIds.slice(0, 1000)
        : [];
      if (ids.length === 0) {
        summary = { sent: 0, failed: 0, skipped: 0 };
        break;
      }
      const { data } = await service
        .from('daily_assignments')
        .select(
          'student_id, driver_name, driver_contact, coasters(coaster_number), profiles!inner(id, phone, full_name, whatsapp_opt_in)',
        )
        .eq('assignment_date', body.date)
        .in('student_id', ids);

      type Row = {
        student_id: string;
        driver_name: string | null;
        driver_contact: string | null;
        coasters:
          { coaster_number: string } | { coaster_number: string }[] | null;
        profiles:
          | {
              id: string;
              phone: string | null;
              full_name: string | null;
              whatsapp_opt_in: boolean;
            }
          | {
              id: string;
              phone: string | null;
              full_name: string | null;
              whatsapp_opt_in: boolean;
            }[];
      };
      const one = <T>(value: T | T[] | null): T | null =>
        Array.isArray(value) ? (value[0] ?? null) : value;

      const rows = ((data ?? []) as Row[]).filter(
        (row) => one(row.profiles)?.whatsapp_opt_in,
      );
      const byStudent = new Map(rows.map((row) => [row.student_id, row]));

      summary = await sendToRecipients(
        service,
        'assignment',
        rows.map((row) => one(row.profiles)!) as Recipient[],
        (r) => {
          const row = byStudent.get(r.id ?? '');
          return [
            r.full_name || 'Student',
            formatDate(body.date),
            one(row?.coasters ?? null)?.coaster_number || '-',
            row?.driver_name || '-',
            row?.driver_contact || '-',
          ];
        },
        // Re-sends if the vehicle/driver changes for the same day.
        (r) => {
          const row = byStudent.get(r.id ?? '');
          return `assignment:${body.date}:${r.id}:${one(row?.coasters ?? null)?.coaster_number}:${row?.driver_name}:${row?.driver_contact}`;
        },
      );
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
