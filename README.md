This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database migrations

SQL migrations live in `supabase/migrations/`. Run new ones in the Supabase
SQL editor (or `supabase db push`) **in this order** before deploying code that
uses them:

1. `20261021_app_settings.sql`: admin-editable payment/bank details (`app_settings`)
2. `20261021_time_options.sql`: admin-defined arrival/departure times (`time_options`) and server-side validation triggers
3. `20261021_whatsapp_notifications.sql`: `profiles.whatsapp_opt_in` and the `whatsapp_messages` log

## WhatsApp alerts (Meta WhatsApp Cloud API)

Opted-in students receive WhatsApp template messages for:

| Event | When | Template (default name) | Body variables |
|---|---|---|---|
| Approval | Admin approves an application | `ee_application_approved` | `{{1}}` name |
| Fee due | 1st of the month, unpaid students (cron) | `ee_fee_due` | `{{1}}` name, `{{2}}` amount, `{{3}}` due date |
| Fee overdue | 10th of the month, still unpaid (cron) | `ee_fee_overdue` | `{{1}}` name, `{{2}}` amount |
| Holiday | Admin adds a no-service day | `ee_holiday_notice` | `{{1}}` date, `{{2}}` reason |
| Assignment | Admin saves daily vehicle/driver assignments | `ee_vehicle_assignment` | `{{1}}` name, `{{2}}` date, `{{3}}` vehicle, `{{4}}` driver, `{{5}}` driver contact |
| Announcement | Admin ticks "Also send on WhatsApp" or clicks "Send on WhatsApp" | `ee_announcement` | `{{1}}` title, `{{2}}` message |
| Test | Admin → WhatsApp tab → Send test | `hello_world` (Meta sample, en_US) | none |

Every attempt is logged in `whatsapp_messages` (visible in Admin → WhatsApp).
Reminders, holiday and assignment messages are de-duplicated, so retries don't
double-send. If WhatsApp isn't configured, nothing is sent and the attempt is
logged as `skipped`.

### Setup

1. In Meta Business Manager, create a WhatsApp Business account and add a phone
   number, then create a **System User** token with `whatsapp_business_messaging`
   permission.
2. In WhatsApp Manager → Message templates, create the templates above
   (category **Utility**, language **English** `en`), with body variables in the
   order shown. Example `ee_fee_due` body:
   `Hi {{1}}, your Eagle Elites transport fee of {{2}} is due by {{3}}. Please pay to keep your seat.`
   Wait for each template to be approved.
3. Set these environment variables in Vercel (Production), then redeploy:

   | Variable | Required | Notes |
   |---|---|---|
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only; used to read opted-in students and write the log |
   | `WHATSAPP_TOKEN` | yes | System User access token |
   | `WHATSAPP_PHONE_NUMBER_ID` | yes | From WhatsApp Manager → Phone numbers |
   | `CRON_SECRET` | yes | Any long random string; Vercel Cron sends it automatically |
   | `WHATSAPP_TEMPLATE_LANG` | no | Default `en` |
   | `WHATSAPP_API_VERSION` | no | Default `v21.0` |
   | `WHATSAPP_TEMPLATE_APPROVAL`, `_FEE_DUE`, `_FEE_OVERDUE`, `_HOLIDAY`, `_ASSIGNMENT`, `_ANNOUNCEMENT`, `_TEST` | no | Override template names |

4. Cron jobs are defined in `vercel.json` (09:00 PKT on the 1st and 10th).
5. Admin → WhatsApp shows which variables are set and lets you send a test.

Phone numbers are normalised to Pakistan format (`+92 3XX XXXXXXX`); students
opt in during onboarding or from their dashboard profile.
