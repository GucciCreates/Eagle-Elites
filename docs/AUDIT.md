# Eagle Elites — production-readiness audit

_November 2026. Covers the code on `main` plus the redesign in PR #3._

Severity: **High** = can expose data or break a core flow · **Medium** = real risk or cost, not urgent · **Low** = polish.
Effort: S (< ½ day) · M (½–2 days) · L (> 2 days).

## 1. Security and correctness

| # | Finding | Why it matters | Sev. | Effort | Phase |
|---|---|---|---|---|---|
| S1 ✅ | Private pages (`/dashboard`, `/onboarding/*`, `/admin/*`, `/driver/*`) only check sign-in **inside the browser**, after the page has loaded. | A signed-out visitor still receives the page code and a flash of the layout; the server never refuses them. Data is still protected by RLS, but there's no server-side gate. | High | S | 1 ✅ |
| S2 ✅ | Drivers can read the **entire profile row** of every student ever assigned to them, on any date (policy `Drivers read assigned students` + the driver clause of `Restrict profile reads to account scope`). | Exposes phone, guardian contact, payment reference and amount, transaction ID and ID-card/proof file paths to drivers. The driver screen only needs name, institution and last 4 CNIC digits for that day's trip. | High | S | 1 ✅ |
| S3 | The base tables (`profiles`, `payments`, `routes`, `pickup_points`, `notifications`, `help_messages`, `holidays`, `coasters`, `admin_users`, `weekly_schedules`, `student_timetables`, expenses) and the `payment-proofs` storage bucket were created in the Supabase dashboard, so their original policies **are not in the repo** and can't be reviewed here. | Any permissive policy created there (e.g. "read for all users") would override what the migrations intend. | High (unknown) | S for owner | 1 — owner to run the check in §4 |
| S4 ✅ | `/api/cron/fee-reminders` compares the secret with `!==`. | Timing-unsafe comparison; low practical risk but trivial to fix. | Low | S | 1 ✅ |
| S5 ✅ | API routes accept loosely validated JSON (no UUID/date/length checks; mixed `{error}` vs `{ok,error}` shapes). | Bad input reaches the database; inconsistent errors make the UI harder to handle. | Medium | S | 1 ✅ |
| S6 ✅ | Minimum password length is 6. | Weak passwords on accounts that hold personal and payment data. | Medium | S (+ Supabase setting) | 1 ✅ |
| S7 ✅ | "Try the demo" writes a fake session to `localStorage`, and `/dashboard` trusts it **before** checking for a real session. | A real signed-in student who once clicked the demo sees fake data; the two modes can mix. | Medium | S | 1 ✅ |
| S8 ✅ | WhatsApp sends one recipient at a time, with a separate duplicate-check query per recipient. | Large announcements can exceed Vercel's function time limit and stop half-way. | Medium | S | 1 ✅ |
| S9 | The **10:00 AM departure-slot cutoff** is enforced only in the student's browser; the database accepts changes after 10:00. | A student can still change their slot after cutoff by calling the API directly. | Medium | S | **Needs owner decision** |
| S10 | The **8-hour trip-time-change rule** is enforced only in the browser; the database enforces "one change per day" but not the 8 hours. | Same as S9. | Medium | S | **Needs owner decision** |

## 2. Performance

| # | Finding | Sev. | Effort | Phase |
|---|---|---|---|---|
| P1 | `app/dashboard/page.tsx` (~2,000 lines) and `app/admin/dashboard/page.tsx` (~2,700 lines) are single client components; every tab ships in one bundle. | Medium | L | 2 |
| P2 | Admin dashboard loads all students, applications, messages, activity and fee history up front with `select('*')` and no pagination. | Medium | M | 2 |
| P5 | Rider dashboard used `.single()` for optional rows (today's trip, timetable, departure choice), so the database answered 406 and logged an error for every student without one. **Fixed in Phase 1** (`maybeSingle`). | Low | S | 1 ✅ |
| P3 | Indexes vs. filters not yet reviewed for `profiles(status, role)`, `payments(student_id)`, `help_messages(status)`. | Low | S | 2 |
| P4 | No Lighthouse baseline. | Low | S | 2 |

## 3. UX, accessibility, SEO, quality

| # | Finding | Phase |
|---|---|---|
| U1 | Onboarding steps not yet on the new design system. | 3 |
| U2 | Feedback is scattered inline text and `alert()`; no shared toast. | 3 |
| U3 | Admin tables scroll sideways on phones. | 3 |
| U4 | Notification "unread" count = total announcements; no read state. | 3 |
| A1 | Menus don't close on Esc or return focus; some icon buttons unlabelled. | 4 |
| A2 | FAQ has no `FAQPage` structured data. | 4 |
| Q1 | No automated tests and no CI. | 5 |
| Q2 | No `app/error.tsx` or per-dashboard error boundaries. | 5 |

## 4. Owner check: live database policies (S3)

Run this in the Supabase SQL editor and send the result (it lists rules only, no data):

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Look especially for any policy on `profiles`, `payments` or `storage.objects` (bucket `payment-proofs`) whose `roles` include `anon` or `public`, or whose `qual` is `true`.

## 5. Plan

1. **Phase 1, security and correctness (done):** S1, S2, S4–S8 and P5 in code + one new migration with rollback, tested on PostgreSQL 16. S3 needs the owner check in §4; S9/S10 await a decision.
2. **Phase 2, performance:** P1–P4.
3. **Phase 3, UI/UX:** U1–U4.
4. **Phase 4, accessibility and SEO:** A1–A2 and a full WCAG 2.2 AA pass.
5. **Phase 5, quality and operations:** Q1–Q2, CI, docs.

Each phase ships as its own draft pull request.
