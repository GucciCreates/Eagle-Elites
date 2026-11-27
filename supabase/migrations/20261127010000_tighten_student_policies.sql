-- Tighten student write access and vehicle visibility (audit, live policy review).
--
-- 1. weekly_schedules / departure_selections: the original "manage own" policies
--    were FOR ALL, which includes DELETE. The app never deletes these rows, but a
--    student could delete a weekly_schedules row and re-insert it, which resets
--    change_count to 0 and bypasses the one-change-per-day rule. Students now get
--    SELECT, INSERT and UPDATE only (upserts keep working). Admin policies are
--    unchanged.
-- 2. coasters: readable by signed-in users only (was readable by anyone, including
--    signed-out visitors). Nothing public uses the vehicle list.
--
-- Safe to re-run. Does NOT touch any row data.
-- Rollback: supabase/rollback/20261127010000_tighten_student_policies_rollback.sql
BEGIN;

-- weekly_schedules
DROP POLICY IF EXISTS "Students manage own schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Students read own schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Students add own schedules" ON public.weekly_schedules;
DROP POLICY IF EXISTS "Students update own schedules" ON public.weekly_schedules;
CREATE POLICY "Students read own schedules"
  ON public.weekly_schedules FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Students add own schedules"
  ON public.weekly_schedules FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own schedules"
  ON public.weekly_schedules FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- departure_selections
DROP POLICY IF EXISTS "Students can manage own selections" ON public.departure_selections;
DROP POLICY IF EXISTS "Students read own selections" ON public.departure_selections;
DROP POLICY IF EXISTS "Students add own selections" ON public.departure_selections;
DROP POLICY IF EXISTS "Students update own selections" ON public.departure_selections;
CREATE POLICY "Students read own selections"
  ON public.departure_selections FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Students add own selections"
  ON public.departure_selections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own selections"
  ON public.departure_selections FOR UPDATE TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- coasters
DROP POLICY IF EXISTS "Anyone can read coasters" ON public.coasters;
DROP POLICY IF EXISTS "Signed-in users can read coasters" ON public.coasters;
CREATE POLICY "Signed-in users can read coasters"
  ON public.coasters FOR SELECT TO authenticated
  USING (true);

COMMIT;
