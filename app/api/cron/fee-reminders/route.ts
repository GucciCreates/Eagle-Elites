import { NextResponse, connection } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendToRecipients, type Recipient } from '@/lib/whatsapp/send';

/**
 * Monthly fee reminders, triggered by Vercel Cron (see vercel.json):
 *   1st  -> ?type=due      to active, opted-in students who haven't paid
 *   10th -> ?type=overdue  to the ones still unpaid on the deadline
 * Each student gets each reminder at most once per month.
 */
export async function GET(request: Request) {
  await connection(); // always run at request time, never prerender
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const service = createServiceClient();
  if (!service) {
    console.info(
      '[cron] fee reminders skipped: SUPABASE_SERVICE_ROLE_KEY not set',
    );
    return NextResponse.json({ ok: true, skipped: 'service role key missing' });
  }

  const type =
    new URL(request.url).searchParams.get('type') === 'overdue'
      ? 'overdue'
      : 'due';

  const now = new Date();
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).format(now); // "2026-11"
  const monthName = now.toLocaleDateString('en-PK', {
    month: 'long',
    timeZone: 'Asia/Karachi',
  });

  const [{ data: students }, { data: routes }] = await Promise.all([
    service
      .from('profiles')
      .select('id, phone, full_name, route_id, fee_status')
      .eq('role', 'student')
      .eq('status', 'active')
      .eq('whatsapp_opt_in', true)
      .neq('fee_status', 'paid'),
    service.from('routes').select('id, price'),
  ]);

  const priceByRoute = new Map(
    (routes ?? []).map((route) => [route.id as string, route.price as number]),
  );
  type Student = Recipient & { route_id: string | null };
  const list = (students ?? []) as Student[];
  const amountFor = (r: Recipient) => {
    const price = priceByRoute.get((r as Student).route_id ?? '');
    return price ? `PKR ${price.toLocaleString('en-PK')}` : 'your monthly fee';
  };

  const summary =
    type === 'due'
      ? await sendToRecipients(
          service,
          'fee_due',
          list,
          (r) => [r.full_name || 'Student', amountFor(r), `10 ${monthName}`],
          (r) => `fee_due:${month}:${r.id}`,
        )
      : await sendToRecipients(
          service,
          'fee_overdue',
          list,
          (r) => [r.full_name || 'Student', amountFor(r)],
          (r) => `fee_overdue:${month}:${r.id}`,
        );

  return NextResponse.json({ ok: true, type, month, ...summary });
}
