-- Rollback for 20261127040000_admin_operations.sql.
-- WARNING: drops the ride_skips table (students' "not riding" days) and the
-- admin_users.staff_role column (assigned staff roles). Export them first if
-- you need them. The 'operations' row in app_settings is left in place; it
-- is harmless, and you can delete it by hand.
BEGIN;

-- The table first: its policies use admin_may().
DROP TABLE IF EXISTS public.ride_skips;

DO $$
DECLARE t TEXT; op TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fee_payments', 'expenses', 'monthly_summaries'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Staff area: finance" ON public.%I', t);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'daily_assignments', 'departure_slots', 'departure_groups', 'drivers', 'coasters',
    'holidays', 'notifications', 'time_options', 'pickup_points',
    'trip_events', 'vehicle_checks'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOREACH op IN ARRAY ARRAY['insert', 'update', 'delete'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Staff area: operations %s" ON public.%I', op, t);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_role_guard ON public.admin_users;
DROP FUNCTION IF EXISTS public.admin_users_role_guard();
DROP FUNCTION IF EXISTS public.admin_may(TEXT);
DROP FUNCTION IF EXISTS public.admin_staff_role();
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_staff_role_check;
ALTER TABLE public.admin_users DROP COLUMN IF EXISTS staff_role;

DROP TRIGGER IF EXISTS holidays_cancel_trips ON public.holidays;
DROP FUNCTION IF EXISTS public.holidays_cancel_trips();

DROP FUNCTION IF EXISTS public.ride_skips_free_seat();
DROP FUNCTION IF EXISTS public.ride_skips_guard();
DROP FUNCTION IF EXISTS public.operations_setting(TEXT);

COMMIT;
