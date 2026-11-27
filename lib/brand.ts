// Single source of truth for brand, contact and legal details.
// Update here and every page (landing, auth, footer, structured data) follows.

export const BRAND = {
  name: 'Eagle Elites',
  legalName: 'Eagles Elite Transport Service (SMC) Pvt Ltd',
  tagline: 'Student & staff transport',
  registration: 'SECP Registered · License No. 023072',
  email: 'eagleselitepk@gmail.com',
  address: 'Office 01, GT Road, Barrier No. 03, Wah Cantt, Pakistan',
  cities: ['Islamabad', 'Rawalpindi', 'Wah Cantt'],
  /** Replace public/brand/logo.svg (and app/icon.svg) with the official logo. */
  logoSrc: '/brand/logo.svg',
} as const;

export const CONTACTS = [
  { name: 'M. Hammad', display: '0322 5166580', e164: '923225166580' },
  { name: 'Engr. Waleed', display: '0313 5018125', e164: '923135018125' },
] as const;

const PRIMARY_WHATSAPP = CONTACTS[0].e164;

export function whatsappLink(message: string) {
  return `https://wa.me/${PRIMARY_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_GENERAL = whatsappLink(
  "Hi Eagle Elites, I'd like to ask about student transport.",
);

/** Public site URL for metadata, sitemap and social cards. */
export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://127.0.0.1:3000');
  return raw.replace(/\/+$/, '');
}
