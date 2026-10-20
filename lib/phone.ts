/**
 * Normalises a Pakistani phone number to E.164 digits without "+",
 * e.g. "0322-5166580", "+92 322 5166580", "3225166580" -> "923225166580".
 * Returns null when the number can't be a valid PK mobile/landline.
 */
export function normalizePkPhone(input: string | null | undefined) {
  if (!input) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(2);
  if (digits.startsWith('92')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  // PK numbers are 10 digits after the country code (mobile: 3XX XXXXXXX).
  if (digits.length !== 10) return null;
  return `92${digits}`;
}

export function isPkMobile(input: string | null | undefined) {
  const normalized = normalizePkPhone(input);
  return Boolean(normalized && normalized.startsWith('923'));
}

/** "923225166580" -> "+92 322 5166580" */
export function formatPkPhone(input: string | null | undefined) {
  const n = normalizePkPhone(input);
  if (!n) return input ?? '';
  return `+92 ${n.slice(2, 5)} ${n.slice(5)}`;
}
