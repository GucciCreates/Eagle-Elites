# Eagle Elites Portal — Product Brief

## Purpose

Replace the manual forms, spreadsheets, and chat-based tracking used for student transport with a shared portal for applicants, active riders, and administrators.

## Current application

- Public landing page with live route fares and seat availability, a fare calculator, pickup-area search, Google sign-up, FAQ, and contact details.
- Student account creation, onboarding, payment-proof submission, and application status tracking.
- Student dashboard for route schedules, departure selections, payments, notices, timetable preferences, and support requests.
- Admin tools for application review, route and vehicle management, assignments, notifications, departure slots, expenses, and payment settings.
- Supabase provides authentication, database, and file storage; Vercel hosts the Next.js application and scheduled fee reminders.
- Optional WhatsApp notifications use the Meta WhatsApp Cloud API and student opt-in.

## Roles and future scope

The portal serves students (and faculty/staff riders), administrators, and drivers. Drivers have their own login to see assigned trips and mark attendance. Delegation/coaster outsourcing and expanded operational reporting remain roadmap items.

## Technical stack

- Next.js App Router and TypeScript
- React and Tailwind CSS
- Supabase Auth, PostgreSQL, and Storage
- Vercel hosting and cron jobs

See the root [README](../README.md) for local setup, environment variables, migrations, and deployment notes.
