# Eagle Elites Portal

Student transport enrollment and operations portal built with Next.js, Supabase, and Vercel. The application supports public route discovery, student onboarding and application review, student schedules, and admin operations. Product context and roadmap are in [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md).

## Repository layout

```text
app/                 Next.js routes, layouts, styles, and API handlers
components/           Shared UI grouped by feature (admin, auth, marketing, onboarding)
lib/                  Auth, Supabase, dates, uploads, pricing, and notification helpers
docs/                 Product brief and project documentation
supabase/migrations/  Database migrations; preserve timestamped filenames
supabase/rollback/    Explicit rollback scripts for matching migrations
public/               Static assets used by the application
```

## Local setup

1. Use Node.js compatible with the installed Next.js version.
2. Copy `.env.example` to `.env.local` and fill in the values for your Supabase project. Keep `.env.local` and all real credentials out of Git.
3. Install dependencies and start the development server:

   ```bash
   npm ci
   npm run dev
   ```

4. Open <http://127.0.0.1:3000>.

For a production build, run `npm run lint`, `npm run build`, then `npm start`.

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | App and public route fares | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser auth and public route fares | Publishable/anon key; database access must be protected by RLS |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public address for share previews, sitemap and canonical links; on Vercel it defaults to the production domain |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin and scheduled jobs | Keep secret; never prefix with `NEXT_PUBLIC_` |
| `CRON_SECRET` | Fee reminder cron | Long random secret used to authorize scheduled requests |
| `WHATSAPP_TOKEN` | WhatsApp notifications | Meta WhatsApp Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp notifications | Phone number ID from WhatsApp Manager |
| `WHATSAPP_TEMPLATE_LANG` | Optional | Defaults to `en` |
| `WHATSAPP_API_VERSION` | Optional | Defaults to `v21.0` in the current integration |
| `WHATSAPP_TEMPLATE_*` | Optional | Override the template names listed below |

WhatsApp credentials are optional for core portal use. The fee reminders and notification endpoints require their server-side credentials to be configured.

## Landing page and branding

The public homepage (`app/page.tsx`, `components/marketing/`) shows live route fares, seats left, pickup areas and institutions from Supabase. It refreshes about once a minute and falls back to built-in lists if the database can't be reached. Visitors can sign up with Google or email, and signed-in visitors are offered a link to their dashboard.

- **Logo:** replace `public/brand/logo.svg` (used across the site) and `app/icon.svg` (browser tab icon) with the official logo. Keep the same file names. To use a PNG instead, change `logoSrc` in `lib/brand.ts`.
- **Contacts, legal name, address:** edit `lib/brand.ts`; the landing page, login screens and search-engine data all read from it.
- **Fees shown in the fare calculator** come from `lib/onboarding/pricing.ts`. Keep it in step with `public.onboarding_amount_due()` in the database.
- **Google sign-in** must be enabled in Supabase; see [docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md).

## Design system

- **Colours** live in `app/globals.css` under `@theme`. Tailwind's `yellow-*` and `zinc-*` scales are re-tuned to the Eagle Elites gold and blue-black, so existing classes stay on-brand. Change a colour there, not in individual pages.
- **Shared styles:** `ee-card`, `ee-inset`, `ee-input`, `ee-label`, `ee-btn` + `ee-btn-primary`/`ee-btn-secondary`, `ee-chip`, `ee-tabbar`, `ee-eyebrow`. The admin light theme has overrides for each.
- **Motion:** `ee-enter` (fade up on mount; add `key` to replay on tab change), `ee-stagger` (children one after another), `ee-reveal` (on scroll, CSS-only), `ee-pop` (menus), `ee-lift` (hover), `ee-skeleton` (loading). All are switched off for visitors who prefer reduced motion.
- **Icons:** `components/ui/icons.tsx` (`<Icon name="bus" />`, `<IconTile name="wallet" />`). Use these instead of emoji.
- **Loading screens:** `components/ui/brand-loader.tsx`.

## Database migrations

Migration files are kept in `supabase/migrations/` with their existing timestamped names. Apply them to the intended Supabase project in migration order, review each migration before applying it, and take a database backup before any schema change. In particular, `20261010_rebuild_departure_schema.sql` drops and recreates departure tables and removes/re-adds a profile column; do not run it against data that must be preserved without a reviewed migration plan.

The later migrations cover RLS hardening, application settings, time options, WhatsApp opt-in/logging, and onboarding updates. The security rollback script is in `supabase/rollback/`; use it only when intentionally reverting its matching migration.

## WhatsApp templates

Students receive messages only when opted in. Configure and get Meta approval for the templates before enabling the relevant notifications. Current template defaults:

| Event | Default template | Variables |
|---|---|---|
| Application approved | `ee_application_approved` | Name |
| Application needs changes | `ee_application_needs_fix` | Name, reason |
| Fee due | `ee_fee_due` | Name, amount, due date |
| Fee overdue | `ee_fee_overdue` | Name, amount |
| Holiday notice | `ee_holiday_notice` | Date, reason |
| Vehicle assignment | `ee_vehicle_assignment` | Name, date, vehicle, driver, contact |
| Announcement | `ee_announcement` | Title, message |
| Test | `hello_world` | Meta sample template |

Configure `WHATSAPP_TEMPLATE_LANG` and the optional `WHATSAPP_TEMPLATE_*` overrides if your approved names or language differ. Attempts are recorded in the `whatsapp_messages` table; missing WhatsApp configuration causes notification attempts to be skipped.

## Scheduled jobs

Vercel cron configuration is in `vercel.json`. Fee reminders call `/api/cron/fee-reminders` on the 1st and 10th of each month. Vercel schedules use UTC; the current `0 4` schedule corresponds to 09:00 in Pakistan Standard Time (UTC+5). Set `CRON_SECRET` in the Vercel project environment before enabling the cron jobs.

## Useful commands

- `npm run dev` — local development server
- `npm run lint` — ESLint
- `npm run build` — production build and type checking
- `npm start` — serve the last production build
