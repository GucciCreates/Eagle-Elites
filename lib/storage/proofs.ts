import type { SupabaseClient } from '@supabase/supabase-js';

export const PROOF_BUCKET = 'payment-proofs';

/**
 * Accepts either a storage path ("<uid>/payment-proof.png") or a legacy
 * public URL (".../object/public/payment-proofs/<uid>/payment-proof.png")
 * and returns the storage path. The bucket is private, so legacy public
 * URLs never worked; we only need the path to create a signed URL.
 */
export function toProofPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const marker = `/${PROOF_BUCKET}/`;
  const index = value.indexOf(marker);
  const path = index >= 0 ? value.slice(index + marker.length) : value;
  return decodeURIComponent(path.split('?')[0]).replace(/^\/+/, '') || null;
}

export function isPdfPath(path: string | null | undefined) {
  return Boolean(path && /\.pdf$/i.test(path));
}

/** Short-lived signed URL for a private proof (admins or the owner). */
export async function getProofSignedUrl(
  supabase: SupabaseClient,
  value: string | null | undefined,
  expiresIn = 600,
): Promise<string | null> {
  const path = toProofPath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
