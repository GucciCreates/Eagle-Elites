import { NextResponse, connection } from 'next/server';
import { addDays, getPakistanDate } from '@/lib/date/pakistan';
import { safeEqual } from '@/lib/api/validate';
import { planDay } from '@/lib/ops/publish-plan';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Publishes tomorrow's plan every evening (Vercel Cron, see vercel.json:
 * 16:30 UTC = 9:30 PM Pakistan, after the 9:00 PM "not riding" cutoff).
 * Turn it off in the admin Settings tab (operations.auto_plan).
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: true, skipped: 'service role key missing' });

  const { data: settings } = await service.from('app_settings').select('value').eq('key', 'operations').maybeSingle();
  if ((settings?.value as { auto_plan?: boolean } | undefined)?.auto_plan === false) {
    return NextResponse.json({ ok: true, skipped: 'auto plan is off' });
  }

  const date = addDays(getPakistanDate(), 1);
  try {
    const { plan, inserted, whatsapp } = await planDay(service, date, { dryRun: false });
    const unplaced = plan.routes.reduce((sum, route) => sum + route.unplaced.length, 0);
    console.info(`[cron] plan ${date}: ${inserted} trips added, ${unplaced} unplaced${plan.holiday ? `, holiday: ${plan.holiday}` : ''}`);
    return NextResponse.json({ ok: true, date, inserted, unplaced, holiday: plan.holiday, whatsapp });
  } catch (error) {
    console.error('[cron] plan failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'Plan failed' }, { status: 500 });
  }
}
