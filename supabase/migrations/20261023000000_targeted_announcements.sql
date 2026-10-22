BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_value TEXT;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_target_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_target_type_check
  CHECK (target_type IN ('all', 'university', 'departure_group', 'unpaid', 'faculty'));

DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
CREATE POLICY "Students read announcements for their audience"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
    OR target_type = 'all'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'student'
        AND (
          (target_type = 'university' AND p.institution = target_value)
          OR (target_type = 'departure_group' AND p.departure_group_id::text = target_value)
          OR (target_type = 'unpaid' AND COALESCE(p.fee_status, '') <> 'paid')
          OR (target_type = 'faculty' AND p.user_type = 'faculty')
        )
    )
  );

DROP POLICY IF EXISTS "Admins create announcements" ON public.notifications;
CREATE POLICY "Admins create announcements"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

COMMIT;
