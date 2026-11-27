-- Rollback for 20261127000000_driver_roster_privacy.sql.
-- Restores the previous driver read access to student profiles exactly as
-- defined in 20261023020000_driver_accounts.sql. Does NOT touch row data.
BEGIN;

DROP POLICY IF EXISTS "Drivers read assigned students" ON public.profiles;
CREATE POLICY "Drivers read assigned students"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_active_driver(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.daily_assignments d
      WHERE d.student_id = profiles.id AND d.driver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Restrict profile reads to account scope" ON public.profiles;
CREATE POLICY "Restrict profile reads to account scope"
  ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR id = auth.uid()
    OR (
      public.is_active_driver(auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.daily_assignments d
        WHERE d.student_id = profiles.id AND d.driver_id = auth.uid()
      )
    )
  );

DROP FUNCTION IF EXISTS public.driver_trip_roster(DATE);

COMMIT;
