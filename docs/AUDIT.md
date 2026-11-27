# Eagle Elites — production-readiness audit

_November 2026. Covers the code on `main` plus the redesign in PR #3._

Severity: **High** = can expose data or break a core flow · **Medium** = real risk or cost, not urgent · **Low** = polish.
Effort: S (< ½ day) · M (½–2 days) · L (> 2 days).

## 1. Security and correctness

| # | Finding | Why it matters | Sev. | Effort | Phase |
|---|---|---|---|---|---|
| S1 ✅ | Private pages (`/dashboard`, `/onboarding/*`, `/admin/*`, `/driver/*`) only check sign-in **inside the browser**, after the page has loaded. | A signed-out visitor still receives the page code and a flash of the layout; the server never refuses them. Data is still protected by RLS, but there's no server-side gate. | High | S | 1 ✅ |
| S2 ✅ | Drivers can read the **entire profile row** of every student ever assigned to them, on any date (policy `Drivers read assigned students` + the driver clause of `Restrict profile reads to account scope`). | Exposes phone, guardian contact, payment reference and amount, transaction ID and ID-card/proof file paths to drivers. The driver screen only needs name, institution and last 4 CNIC digits for that day's trip. | High | S | 1 ✅ |
| S3 ✅ | The base tables and the `payment-proofs` bucket were created in the Supabase dashboard, so their policies weren't in the repo. **Reviewed from the live database on 27 Nov 2026** (see §6): no private data is exposed to signed-out users or other students; storage is private, insert-only and per-student. Two gaps found → S11, S12. | — | — | 1 ✅ |
| S4 ✅ | `/api/cron/fee-reminders` compares the secret with `!==`. | Timing-unsafe comparison; low practical risk but trivial to fix. | Low | S | 1 ✅ |
| S5 ✅ | API routes accept loosely validated JSON (no UUID/date/length checks; mixed `{error}` vs `{ok,error}` shapes). | Bad input reaches the database; inconsistent errors make the UI harder to handle. | Medium | S | 1 ✅ |
| S6 ✅ | Minimum password length is 6. | Weak passwords on accounts that hold personal and payment data. | Medium | S (+ Supabase setting) | 1 ✅ |
| S7 ✅ | "Try the demo" writes a fake session to `localStorage`, and `/dashboard` trusts it **before** checking for a real session. | A real signed-in student who once clicked the demo sees fake data; the two modes can mix. | Medium | S | 1 ✅ |
| S8 ✅ | WhatsApp sends one recipient at a time, with a separate duplicate-check query per recipient. | Large announcements can exceed Vercel's function time limit and stop half-way. | Medium | S | 1 ✅ |
| S11 ✅ | `weekly_schedules` and `departure_selections` student policies were `FOR ALL`, including DELETE (unused by the app). Deleting and re-adding a schedule day reset `change_count` to 0, bypassing the one-change-per-day rule. | Medium | S | 1b ✅ |
| S12 ✅ | `coasters` (vehicle numbers, capacity, maintenance status) was readable by signed-out visitors. | Low | S | 1b ✅ |
| S9 | The **10:00 AM departure-slot cutoff** is enforced only in the student's browser; the database accepts changes after 10:00. | A student can still change their slot after cutoff by calling the API directly. | Medium | S | **Needs owner decision** |
| S10 | The **8-hour trip-time-change rule** is enforced only in the browser; the database enforces "one change per day" but not the 8 hours. | Same as S9. | Medium | S | **Needs owner decision** |

## 2. Performance

| # | Finding | Sev. | Effort | Phase |
|---|---|---|---|---|
| P1 ✅ | `app/admin/dashboard/page.tsx` (~2,700 lines) and the rider dashboard (~2,000 lines) are single client components. **Measured:** the admin page's own code is ~23 KB compressed of ~240 KB loaded; React, Next.js and the Supabase SDK make up the rest. The five tabs already in their own files (Applications, Times, WhatsApp, Settings, proof viewer) now download only when opened. Splitting the remaining inline tabs would save ~10 KB for a large, risky rewrite, so it's left for when those tabs are next reworked. The bigger win was the landing page: it no longer downloads the Supabase SDK before it shows (see §2.1). | Medium | L | 2 ✅ |
| P2 ✅ | Admin dashboard loaded every student column, every help message, announcement and departure slot ever written, and up to 5,000 fee payments, all up front. **Now:** only the student columns the screens use (falls back to the old query if a column is missing); all open/unread messages plus the latest 100 closed ones; the latest 100 announcements with the true total in the badge; departure slots from the last 14 days (older dates load when picked); fee payments only when the Fees tab opens, for the chosen month plus the latest 100; the monthly attendance report only on its tab. | Medium | M | 2 ✅ |
| P5 | Rider dashboard used `.single()` for optional rows (today's trip, timetable, departure choice), so the database answered 406 and logged an error for every student without one. **Fixed in Phase 1** (`maybeSingle`). | Low | S | 1 ✅ |
| P3 ✅ | Indexes for the dashboards' filters: `supabase/migrations/20261127020000_performance_indexes.sql` (+ rollback). Adds indexes only, tested on PostgreSQL 16: re-runs cleanly, row counts unchanged, rollback removes them, and the slot, fee and student queries switch from full scans to index scans. **Owner to apply.** | Low | S | 2 ✅ |
| P4 ✅ | Lighthouse baseline recorded in §2.1. | Low | S | 2 ✅ |

### 2.1 Measurements (27 Nov 2026)

Production build, served locally against the test backend; Lighthouse 12.8.2 mobile preset, median of 3 runs. "JS before load" is the compressed JavaScript the browser fetches before the page's `load` event (prefetching for later pages happens after it).

| Page | JS before load: before → after | Lighthouse performance | Largest paint | Blocking time |
|---|---|---|---|---|
| `/` (landing) | 214 KB → **149 KB** (−30%) | 86 → **89** | 3.4 s → **3.1 s** | 279 → **221 ms** |
| `/auth/login` | 220 KB → 220 KB | 96 → 95 (noise) | 2.6 → 2.7 s | 143 → 191 ms |
| `/demo` | 230 KB → 230 KB | 91 → 91 | 3.1 → 3.1 s | 178 → 174 ms |
| `/admin/dashboard` | 247 KB → 242 KB | — (sign-in needed) | — | — |

Accessibility 96–100, best practices 100, SEO 100 on the landing page and sign-in (the demo scores 66 for SEO on purpose: it's marked `noindex`). The landing page's remaining delay is layout and paint work for the styled hero on a throttled phone, not JavaScript size. The admin data changes don't show in these numbers because the test backend holds only a few rows; they grow with the real database (every message, slot and payment was being downloaded on each visit).

## 3. UX, accessibility, SEO, quality

| # | Finding | Phase |
|---|---|---|
| U1 | Onboarding steps not yet on the new design system. | 3 |
| U2 | Feedback is scattered inline text and `alert()`; no shared toast. | 3 |
| U3 | Admin tables scroll sideways on phones. | 3 |
| U4 | Notification "unread" count = total announcements; no read state. | 3 |
| A1 | Menus don't close on Esc or return focus; some icon buttons unlabelled. | 4 |
| A2 | FAQ has no `FAQPage` structured data. | 4 |
| Q1 ✅ | No automated tests and no CI. **Added:** 37 unit tests, 17 end-to-end tests, GitHub Actions CI. | 5 ✅ |
| Q2 ✅ | No `app/error.tsx` or per-dashboard error boundaries. **Added** with a friendly retry screen. | 5 ✅ |

## 4. Owner check: live database policies (S3)

Run this in the Supabase SQL editor and send the result (it lists rules only, no data):

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Look especially for any policy on `profiles`, `payments` or `storage.objects` (bucket `payment-proofs`) whose `roles` include `anon` or `public`, or whose `qual` is `true`.

## 6. Live policy review (27 Nov 2026)

Reviewed all 60 policies exported from `pg_policies` in the live project.

- **Fine:** `profiles` (own row or privileged only, after the driver migration), `payments`, `help_messages`, `fee_payments`, `whatsapp_messages`, `admin_activity_log`, `expenses`, `monthly_summaries`, `driver_trips`, `app_settings`, `notifications` (audience-scoped), `drivers`, `daily_assignments` (restrictive scope + guard triggers).
- **Public read by design (landing page / onboarding):** `routes`, `pickup_points`, `pickup_zones` (active only), `departure_groups`, `departure_slots`, `holidays`, `time_options`.
- **Storage `payment-proofs`:** students insert and read only inside their own folder (`<user id>/…`); admins read all; no update or delete policies, and the app uploads unique file names, so files can't be overwritten.
- **Fixed in `20261127010000_tighten_student_policies`:** S11 (student DELETE on schedules and departure choices) and S12 (vehicle list visible to signed-out visitors).
- **Left as is:** `bookings` is not used anywhere in the code, but students can insert rows into it. It's harmless; drop it once you're sure nothing outside the app uses it.
- **Confirmed private:** `storage.buckets` shows `payment-proofs` with `public = false` (checked 27 Nov 2026), so files can't be opened through public URLs.

## 5. Plan

1. **Phase 1, security and correctness (done):** S1, S2, S4–S8 and P5 in code + one new migration with rollback, tested on PostgreSQL 16. S3 needs the owner check in §4; S9/S10 await a decision.
2. **Phase 2, performance (done):** P1–P4; the index migration awaits the owner.
3. **Phase 3, UI/UX:** U1–U4.
4. **Phase 4, accessibility and SEO:** A1–A2 and a full WCAG 2.2 AA pass.
5. **Phase 5, quality and operations:** Q1–Q2, CI, docs.

Each phase ships as its own draft pull request.
