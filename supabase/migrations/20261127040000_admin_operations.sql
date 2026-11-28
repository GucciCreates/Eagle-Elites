-- Admin operations: "not riding" days, holiday auto-cancel, staff roles and
-- operations settings.
--
-- Adds one table, one column (admin_users.staff_role, default 'owner' so
-- every existing admin keeps full access), triggers and policies. Deletes
-- nothing at migration time. Safe to re-run.
--
-- Behaviour it adds (both requested by the owner):
--   * When a student marks a day "not riding", their seat for that day is
--     freed (their unmarked daily_assignments row for that date is removed).
--   * When an admin adds a holiday, that day's unmarked trips are removed.
--   Rows whose attendance was already recorded are never touched.
--
-- Rollback: supabase/rollback/20261127040000_admin_operations_rollback.sql
BEGIN;

-- ---------------------------------------------------------------------------
-- Settings (editable in the admin Settings tab).
--   skip_cutoff    last time (Pakistan) to change tomorrow's "not riding"
--   auto_plan      publish tomorrow's plan automatically each evening
--   trip_whatsapp  send WhatsApp for driver trip updates
-- ---------------------------------------------------------------------------
INSERT INTO public.app_settings (key, value)
VALUES ('operations', jsonb_build_object('skip_cutoff', '21:00', 'auto_plan', true, 'trip_whatsapp', true))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.operations_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value ->> p_key FROM public.app_settings WHERE key = 'operations';
$$;

REVOKE ALL ON FUNCTION public.operations_setting(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.operations_setting(TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ride_skips: "I won't ride on this day".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ride_skips (
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skip_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, skip_date)
);

CREATE INDEX IF NOT EXISTS ride_skips_date_idx ON public.ride_skips (skip_date);

ALTER TABLE public.ride_skips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ride skips" ON public.ride_skips;
CREATE POLICY "Admins manage ride skips"
  ON public.ride_skips FOR ALL TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

DROP POLICY IF EXISTS "Students read own ride skips" ON public.ride_skips;
CREATE POLICY "Students read own ride skips"
  ON public.ride_skips FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students add own ride skips" ON public.ride_skips;
CREATE POLICY "Students add own ride skips"
  ON public.ride_skips FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students remove own ride skips" ON public.ride_skips;
CREATE POLICY "Students remove own ride skips"
  ON public.ride_skips FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- Students can change a day from tomorrow up to 14 days ahead; tomorrow
-- closes at the skip_cutoff time (default 9:00 PM, Pakistan time).
CREATE OR REPLACE FUNCTION public.ride_skips_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW() AT TIME ZONE 'Asia/Karachi';
  v_cutoff TIME := COALESCE(NULLIF(public.operations_setting('skip_cutoff'), '')::TIME, TIME '21:00');
  v_date DATE := CASE WHEN TG_OP = 'DELETE' THEN OLD.skip_date ELSE NEW.skip_date END;
BEGIN
  IF public.is_privileged() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_date <= v_now::DATE OR v_date > v_now::DATE + 14 THEN
    RAISE EXCEPTION 'You can change days from tomorrow up to two weeks ahead.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_date = v_now::DATE + 1 AND v_now::TIME >= v_cutoff THEN
    RAISE EXCEPTION 'Changes for tomorrow closed at %.', to_char(v_cutoff, 'FMHH12:MI AM')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS ride_skips_guard ON public.ride_skips;
CREATE TRIGGER ride_skips_guard
  BEFORE INSERT OR DELETE ON public.ride_skips
  FOR EACH ROW EXECUTE FUNCTION public.ride_skips_guard();

-- Free the seat: remove that day's trip if attendance isn't recorded yet.
CREATE OR REPLACE FUNCTION public.ride_skips_free_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.daily_assignments
  WHERE student_id = NEW.student_id
    AND assignment_date = NEW.skip_date
    AND attendance_status IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_skips_free_seat ON public.ride_skips;
CREATE TRIGGER ride_skips_free_seat
  AFTER INSERT ON public.ride_skips
  FOR EACH ROW EXECUTE FUNCTION public.ride_skips_free_seat();

-- ---------------------------------------------------------------------------
-- Holidays cancel that day's trips (unmarked rows only).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.holidays_cancel_trips()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.daily_assignments
  WHERE assignment_date = NEW.date
    AND attendance_status IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS holidays_cancel_trips ON public.holidays;
CREATE TRIGGER holidays_cancel_trips
  AFTER INSERT ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.holidays_cancel_trips();

-- ---------------------------------------------------------------------------
-- Staff roles.
--   owner       everything, including staff roles
--   operations  trips, drivers, vehicles, schedules, messages; no finance data
--   accounts    fees, payments and expenses; can't change trips or vehicles
-- Every existing admin becomes 'owner', so nothing changes until the owner
-- assigns roles.
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS staff_role TEXT NOT NULL DEFAULT 'owner';

ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_staff_role_check;
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_staff_role_check CHECK (staff_role IN ('owner', 'operations', 'accounts'));

CREATE OR REPLACE FUNCTION public.admin_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT staff_role FROM public.admin_users WHERE id = auth.uid();
$$;

-- True unless the caller is an admin whose role doesn't cover the area.
-- Students, drivers and the service role are unaffected (other policies
-- decide for them).
CREATE OR REPLACE FUNCTION public.admin_may(p_area TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN r IS NULL OR r = 'owner' THEN TRUE
    WHEN p_area = 'operations' THEN r = 'operations'
    WHEN p_area = 'finance' THEN r = 'accounts'
    ELSE FALSE
  END
  FROM (SELECT public.admin_staff_role() AS r) AS caller;
$$;

REVOKE ALL ON FUNCTION public.admin_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_may(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_may(TEXT) TO authenticated, service_role;

-- Only an owner changes roles, and there is always at least one owner.
CREATE OR REPLACE FUNCTION public.admin_users_role_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_role IS NOT DISTINCT FROM OLD.staff_role THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND COALESCE(public.admin_staff_role(), '') <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can change staff roles.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD.staff_role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE staff_role = 'owner' AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'Keep at least one owner.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_role_guard ON public.admin_users;
CREATE TRIGGER admin_users_role_guard
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.admin_users_role_guard();

-- Finance data: hidden from operations staff (read and write).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fee_payments', 'expenses', 'monthly_summaries'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Staff area: finance" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "Staff area: finance" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated '
        'USING (public.admin_may(''finance'')) WITH CHECK (public.admin_may(''finance''))', t);
    END IF;
  END LOOP;
END;
$$;

-- Operations data: accounts staff can read it but not change it.
DO $$
DECLARE t TEXT; op TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'daily_assignments', 'departure_slots', 'departure_groups', 'drivers', 'coasters',
    'holidays', 'notifications', 'time_options', 'pickup_points',
    'trip_events', 'vehicle_checks', 'ride_skips'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOREACH op IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Staff area: operations %s" ON public.%I', lower(op), t);
        IF op = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY "Staff area: operations insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated '
            'WITH CHECK (public.admin_may(''operations''))', t);
        ELSE
          EXECUTE format(
            'CREATE POLICY "Staff area: operations %s" ON public.%I AS RESTRICTIVE FOR %s TO authenticated '
            'USING (public.admin_may(''operations''))', lower(op), t, op);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
