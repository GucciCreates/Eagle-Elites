// WhatsApp Cloud API (Meta) configuration, read from env at runtime.

export type WhatsAppEvent =
  | 'approval'
  | 'rejection'
  | 'fee_due'
  | 'fee_overdue'
  | 'holiday'
  | 'assignment'
  | 'announcement'
  | 'test';

/** Template name per event; override with env vars. */
export const TEMPLATE_ENV: Record<WhatsAppEvent, [string, string]> = {
  approval: ['WHATSAPP_TEMPLATE_APPROVAL', 'ee_application_approved'],
  rejection: ['WHATSAPP_TEMPLATE_REJECTION', 'ee_application_needs_fix'],
  fee_due: ['WHATSAPP_TEMPLATE_FEE_DUE', 'ee_fee_due'],
  fee_overdue: ['WHATSAPP_TEMPLATE_FEE_OVERDUE', 'ee_fee_overdue'],
  holiday: ['WHATSAPP_TEMPLATE_HOLIDAY', 'ee_holiday_notice'],
  assignment: ['WHATSAPP_TEMPLATE_ASSIGNMENT', 'ee_vehicle_assignment'],
  announcement: ['WHATSAPP_TEMPLATE_ANNOUNCEMENT', 'ee_announcement'],
  test: ['WHATSAPP_TEMPLATE_TEST', 'hello_world'],
};

export function getTemplateName(event: WhatsAppEvent) {
  const [envName, fallback] = TEMPLATE_ENV[event];
  return process.env[envName] || fallback;
}

export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return {
    token,
    phoneNumberId,
    language: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    configured: Boolean(token && phoneNumberId),
  };
}
