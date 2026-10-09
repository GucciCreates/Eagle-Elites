# Eagle Elites Portal - Project Brief

## Business Context

Eagle Elites is a logistics company with ~35 coasters serving 500-600+ students. They handle two services:

1. Transport for students and faculty
2. Outsourcing coasters for delegations

Current process: Google Forms → Excel → WhatsApp lists (very manual).

## Solution

A web portal with three user roles:

- **Students:** book transport, track bookings, pay fees
- **Drivers:** see daily manifest and attendance
- **Owners:** manage routes, coasters, revenue, expenses, delegations

## Tech Stack

- **Framework:** Next.js (TypeScript + App Router)
- **Styling:** Tailwind CSS (mobile-first)
- **Database & Auth:** Supabase (PostgreSQL + Auth)
- **Hosting:** Vercel
- **AI:** Claude Code in VS Code

## Database Tables (to build)

- `profiles` (students, drivers, admins with role)
- `routes` (route name, price per seat)
- `pickup_points` (location, address)
- `coasters` (vehicle details, capacity)
- `trips` (date, time, route, coaster, driver)
- `bookings` (student, trip, status)
- `payments` (amount, status, date)
- `expenses` (fuel, maintenance, salaries, tolls)

## Phase 1: MVP (weeks 1-6)

1. Student sign-up and login (Supabase Auth)
2. Route and pickup selection
3. Time-slot booking
4. Admin panel listing bookings
5. Payment tracking (manual for now)

## Phase 2 (weeks 7-10)

- Driver mobile view
- Automated reminders

## Phase 3 (weeks 11-16)

- Owner dashboard with analytics
- Delegation module
- Expense tracking

## Deployment

- Local: `http://localhost:3000`
- Live: `eagle-elites.vercel.app` (updates on every `git push`)

## Current Status

- ✓ Project created and deployed to Vercel
- ✓ Supabase database connected
- ✓ Environment variables set
- Next: Build student sign-up and login
