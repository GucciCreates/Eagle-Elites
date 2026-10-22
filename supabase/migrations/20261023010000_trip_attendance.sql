BEGIN;

ALTER TABLE public.daily_assignments
  ADD COLUMN IF NOT EXISTS attendance_status TEXT,
  ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_marked_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.daily_assignments
  DROP CONSTRAINT IF EXISTS daily_assignments_attendance_status_check;
ALTER TABLE public.daily_assignments
  ADD CONSTRAINT daily_assignments_attendance_status_check
  CHECK (attendance_status IS NULL OR attendance_status IN ('present', 'absent'));

CREATE INDEX IF NOT EXISTS daily_assignments_attendance_date_idx
  ON public.daily_assignments (assignment_date, attendance_status);

DROP POLICY IF EXISTS "Admins manage trip attendance" ON public.daily_assignments;
CREATE POLICY "Admins manage trip attendance"
  ON public.daily_assignments FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

COMMIT;
