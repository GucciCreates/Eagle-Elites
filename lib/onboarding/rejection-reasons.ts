export type RejectionReason = {
  code: string;
  label: string;
  message: string;
  fix: string;
};

/** One-click reasons for the admin; `fix` tells the student what to do. */
export const REJECTION_REASONS: RejectionReason[] = [
  {
    code: 'proof_unclear',
    label: 'Proof unclear',
    message: 'The payment screenshot is blurry or cut off.',
    fix: 'Upload a clear, full screenshot or PDF of the transfer.',
  },
  {
    code: 'amount_mismatch',
    label: 'Wrong amount',
    message: 'The amount paid does not match the amount due.',
    fix: 'Pay the remaining balance and upload proof of both transfers.',
  },
  {
    code: 'payment_not_found',
    label: 'Payment not received',
    message: 'We could not find this payment in our account.',
    fix: 'Check the transaction ID and that it was sent to the account shown.',
  },
  {
    code: 'duplicate_transaction',
    label: 'Duplicate transaction ID',
    message: 'This transaction ID was already used on another application.',
    fix: 'Enter the transaction ID of your own transfer.',
  },
  {
    code: 'details_invalid',
    label: 'Details incorrect',
    message: 'Some of your profile details are missing or incorrect.',
    fix: 'Check your enrolment number, phone and institution.',
  },
  {
    code: 'route_unavailable',
    label: 'Route not available',
    message: 'The selected route or pickup point is not available.',
    fix: 'Pick a different route or pickup point.',
  },
  {
    code: 'other',
    label: 'Other',
    message: '',
    fix: 'Read the note from our team and update your application.',
  },
];

export function findRejectionReason(code: string | null | undefined) {
  return REJECTION_REASONS.find((r) => r.code === code) ?? null;
}
