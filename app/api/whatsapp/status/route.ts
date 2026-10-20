import { NextResponse, connection } from 'next/server';
import {
  createServiceClient,
  getAdminFromRequest,
} from '@/lib/supabase/service';
import {
  TEMPLATE_ENV,
  getTemplateName,
  getWhatsAppConfig,
  type WhatsAppEvent,
} from '@/lib/whatsapp/config';

/** Admin-only: which pieces of WhatsApp config are present (never values). */
export async function GET(request: Request) {
  await connection(); // always run at request time, never prerender
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({
      ok: true,
      serviceRole: false,
      whatsapp: false,
      cronSecret: Boolean(process.env.CRON_SECRET),
      templates: {},
    });
  }

  if (!(await getAdminFromRequest(request, service))) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const templates = Object.fromEntries(
    (Object.keys(TEMPLATE_ENV) as WhatsAppEvent[]).map((event) => [
      event,
      getTemplateName(event),
    ]),
  );

  return NextResponse.json({
    ok: true,
    serviceRole: true,
    whatsapp: getWhatsAppConfig().configured,
    cronSecret: Boolean(process.env.CRON_SECRET),
    templates,
  });
}
