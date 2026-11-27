-- Rollback for 20261127020000_performance_indexes.sql.
-- Drops only the indexes that migration added. Does NOT touch row data.
BEGIN;

DROP INDEX IF EXISTS public.profiles_role_name_idx;
DROP INDEX IF EXISTS public.profiles_status_idx;
DROP INDEX IF EXISTS public.payments_student_created_idx;
DROP INDEX IF EXISTS public.help_messages_status_created_idx;
DROP INDEX IF EXISTS public.help_messages_created_idx;
DROP INDEX IF EXISTS public.notifications_created_idx;
DROP INDEX IF EXISTS public.fee_payments_month_recorded_idx;
DROP INDEX IF EXISTS public.departure_slots_date_idx;
DROP INDEX IF EXISTS public.departure_selections_date_idx;
DROP INDEX IF EXISTS public.weekly_schedules_week_idx;

COMMIT;
