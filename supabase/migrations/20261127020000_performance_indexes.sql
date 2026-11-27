-- Indexes for the filters the dashboards use (audit finding P3).
--
-- Adds indexes only. Does NOT change, move or delete any row, policy or
-- column. Safe to re-run (IF NOT EXISTS).
--
-- Each CREATE INDEX briefly blocks writes to its table while it builds. At
-- this project's size that is well under a second; run it outside busy
-- hours anyway.
--
-- Rollback: supabase/rollback/20261127020000_performance_indexes_rollback.sql
BEGIN;

-- Admin student list: role = 'student' ORDER BY full_name.
CREATE INDEX IF NOT EXISTS profiles_role_name_idx
  ON public.profiles (role, full_name);

-- Admin dashboard and student status checks: status filter.
CREATE INDEX IF NOT EXISTS profiles_status_idx
  ON public.profiles (status);

-- Student payment history: student_id ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS payments_student_created_idx
  ON public.payments (student_id, created_at DESC);

-- Admin inbox: open/unread messages and newest first.
CREATE INDEX IF NOT EXISTS help_messages_status_created_idx
  ON public.help_messages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS help_messages_created_idx
  ON public.help_messages (created_at DESC);

-- Announcements, newest first (admin and student dashboards).
CREATE INDEX IF NOT EXISTS notifications_created_idx
  ON public.notifications (created_at DESC);

-- Fees tab: one fee month, and the latest payments.
CREATE INDEX IF NOT EXISTS fee_payments_month_recorded_idx
  ON public.fee_payments (fee_month DESC, recorded_at DESC);

-- Admin departures: slots from a date onwards; today's selections.
CREATE INDEX IF NOT EXISTS departure_slots_date_idx
  ON public.departure_slots (slot_date);
CREATE INDEX IF NOT EXISTS departure_selections_date_idx
  ON public.departure_selections (selection_date);

-- Admin weekly plan: every student's schedule for one week.
CREATE INDEX IF NOT EXISTS weekly_schedules_week_idx
  ON public.weekly_schedules (week_start);

COMMIT;
