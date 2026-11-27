-- Driver roster privacy (audit finding S2).
--
-- Before: drivers could SELECT the full profiles row (phone, guardian contact,
-- payment reference/amount, transaction ID, document paths, ...) of every
-- student ever assigned to them, on any date.
--
-- After: drivers read their roster only through driver_trip_roster(date),
-- which returns name, institution and last 4 CNIC digits for students on
-- the driver's own trips that day. Drivers no longer read profiles directly.
--
-- Safe to re-run. Does NOT touch any row data.
-- Rollback: supabase/rollback/20261127000000_driver_roster_privacy_rollback.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.driver_trip_roster(p_date DATE)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  institution TEXT,
  cnic_last4 TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name::TEXT, p.institution::TEXT, p.cnic_last4::TEXT
  FROM public.daily_assignments d
  JOIN public.profiles p ON p.id = d.student_id
  WHERE d.driver_id = auth.uid()
    AND d.assignment_date = p_date
    AND public.is_active_driver(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.driver_trip_roster(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_trip_roster(DATE) TO authenticated;

-- Drivers no longer read student profile rows directly.
DROP POLICY IF EXISTS "Drivers read assigned students" ON public.profiles;

DROP POLICY IF EXISTS "Restrict profile reads to account scope" ON public.profiles;
CREATE POLICY "Restrict profile reads to account scope"
  ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_privileged() OR id = auth.uid());

COMMIT;
