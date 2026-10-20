import type { SupabaseClient } from '@supabase/supabase-js';

export type PaymentSettings = {
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string;
  instructions?: string;
};

/** Used when the settings row is missing or can't be read. */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  bank_name: 'Meezan Bank',
  account_title: 'Eagles Elite Transport Service & Tour Planners',
  account_number: '98370114507755',
  iban: 'PK31MEZN0098370114507755',
  instructions: '',
};

export async function fetchPaymentSettings(
  supabase: SupabaseClient,
): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'payment')
    .maybeSingle();

  if (error || !data?.value) return DEFAULT_PAYMENT_SETTINGS;
  const value = data.value as Partial<PaymentSettings>;
  return {
    bank_name: value.bank_name || DEFAULT_PAYMENT_SETTINGS.bank_name,
    account_title:
      value.account_title || DEFAULT_PAYMENT_SETTINGS.account_title,
    account_number:
      value.account_number ?? DEFAULT_PAYMENT_SETTINGS.account_number,
    iban: value.iban || DEFAULT_PAYMENT_SETTINGS.iban,
    instructions: value.instructions ?? '',
  };
}

export function isValidPkIban(iban: string) {
  return /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(
    iban.replace(/\s/g, '').toUpperCase(),
  );
}
