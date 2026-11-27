/** URL-safe slug for an institution or campus name ("FAST-NUCES" → "fast-nuces"). */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Official logos, by slug. Drop a file into public/institutions/ and list it
 * here; institutions without one show a clean wordmark instead.
 */
export const INSTITUTION_LOGOS: Record<string, string> = {};

export function institutionLogo(name: string): string | null {
  return INSTITUTION_LOGOS[slugify(name)] ?? null;
}

/** Short label for wordmarks ("National Defence University" → "NDU"). */
export function institutionShortName(name: string) {
  const known: Record<string, string> = {
    'national defence university': 'NDU',
    'national university of sciences and technology': 'NUST',
    'air university': 'Air University',
    'bahria university': 'Bahria University',
  };
  return known[name.trim().toLowerCase()] ?? name.trim();
}
