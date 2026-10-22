# Eagle Elites Portal — Product Brief

## Purpose

Replace the manual forms, spreadsheets, and chat-based tracking used for student transport with a shared portal for applicants, active riders, and administrators.

## Current application

- Public landing page with route fares, pickup coverage, application guidance, and contact details.
- Student account creation, onboarding, payment-proof submission, and application status tracking.
- Student dashboard for route schedules, departure selections, payments, notices, timetable preferences, and support requests.
- Admin tools for application review, route and vehicle management, assignments, notifications, departure slots, expenses, and payment settings.
- Supabase provides authentication, database, and file storage; Vercel hosts the Next.js application and scheduled fee reminders.
- Optional WhatsApp notifications use the Meta WhatsApp Cloud API and student opt-in.

## Roles and future scope

The current portal focuses on students and administrators. Driver-specific manifests and attendance, delegation/coaster outsourcing, and expanded operational reporting remain product roadmap items unless separately implemented.

## Technical stack

- Next.js App Router and TypeScript
- React and Tailwind CSS
- Supabase Auth, PostgreSQL, and Storage
- Vercel hosting and cron jobs

See the root [README](../README.md) for local setup, environment variables, migrations, and deployment notes.
