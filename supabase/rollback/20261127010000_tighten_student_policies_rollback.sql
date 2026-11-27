-- Rollback for 20261127010000_tighten_student_policies.sql.
-- Restores the policies exactly as they were in the live database on 2026-11-27.
-- Does NOT touch row data.
BEGIN;

DROP POLICY IF EXISTS "Students read own schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Students add own schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Students update own schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Students manage own schedules" ON public.weekly_schedules;
CREATE POLICY "Students manage own schedules"
  ON public.weekly_schedules FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students read own selections" ON public.departure_selections;
DROP POLICY IF EXISTS "Students add own selections" ON public.departure_selections;
DROP POLICY IF EXISTS "Students update own selections" ON public.departure_selections;
DROP POLICY IF EXISTS "Students can manage own selections" ON public.departure_selections;
CREATE POLICY "Students can manage own selections"
  ON public.departure_selections FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Signed-in users can read coasters" ON public.coasters;
DROP POLICY IF EXISTS "Anyone can read coasters" ON public.coasters;
CREATE POLICY "Anyone can read coasters"
  ON public.coasters FOR SELECT
  USING (true);

COMMIT;
