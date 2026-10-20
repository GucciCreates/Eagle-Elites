// Mirrors public.onboarding_amount_due() in the onboarding_v2 migration.
export const AC_SURCHARGE = 500;
export const RESERVATION_FEE = 1000;

export function monthlyFee(routePrice: number, wantsAc: boolean) {
  return routePrice + (wantsAc ? AC_SURCHARGE : 0);
}

export function amountDue(routePrice: number, wantsAc: boolean) {
  return monthlyFee(routePrice, wantsAc) + RESERVATION_FEE;
}

export function formatPkr(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

/** Applications are usually reviewed within this window (business hours). */
export const EXPECTED_REVIEW_HOURS = 24;
