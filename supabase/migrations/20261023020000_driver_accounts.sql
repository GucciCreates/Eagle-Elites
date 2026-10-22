BEGIN;

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_driver(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = p_user_id AND d.active = TRUE
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_driver(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_driver(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage driver accounts" ON public.drivers;
CREATE POLICY "Admins manage driver accounts"
  ON public.drivers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

DROP POLICY IF EXISTS "Drivers read own account" ON public.drivers;
CREATE POLICY "Drivers read own account"
  ON public.drivers FOR SELECT TO authenticated
  USING (id = auth.uid() AND active = TRUE);

-- Driver auth users are represented in drivers, not student profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'account_type', '') = 'driver' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (id, email, role, status, fee_status)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'student', 'incomplete', 'unpaid')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE public.daily_assignments
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS daily_assignments_driver_date_idx
  ON public.daily_assignments (driver_id, assignment_date);

DROP POLICY IF EXISTS "Drivers read assigned trips" ON public.daily_assignments;
CREATE POLICY "Drivers read assigned trips"
  ON public.daily_assignments FOR SELECT TO authenticated
  USING (driver_id = auth.uid() AND public.is_active_driver(auth.uid()));

DROP POLICY IF EXISTS "Drivers record assigned trip attendance" ON public.daily_assignments;
CREATE POLICY "Drivers record assigned trip attendance"
  ON public.daily_assignments FOR UPDATE TO authenticated
  USING (driver_id = auth.uid() AND public.is_active_driver(auth.uid()))
  WITH CHECK (driver_id = auth.uid() AND public.is_active_driver(auth.uid()));

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

-- Restrictive read scopes prevent any older permissive policy from exposing
-- other students or unrelated assignments to a driver session.
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

DROP POLICY IF EXISTS "Restrict trip reads to assigned account" ON public.daily_assignments;
CREATE POLICY "Restrict trip reads to assigned account"
  ON public.daily_assignments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.is_privileged()
    OR student_id = auth.uid()
    OR (driver_id = auth.uid() AND public.is_active_driver(auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.daily_assignments_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged() THEN
    RETURN NEW;
  END IF;

  IF public.is_active_driver(auth.uid()) THEN
    IF OLD.driver_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only record attendance for your assigned trips.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.id := OLD.id;
    NEW.student_id := OLD.student_id;
    NEW.coaster_id := OLD.coaster_id;
    NEW.driver_name := OLD.driver_name;
    NEW.driver_contact := OLD.driver_contact;
    NEW.driver_id := OLD.driver_id;
    NEW.assignment_date := OLD.assignment_date;
    NEW.created_at := OLD.created_at;
    NEW.seat_confirmed := OLD.seat_confirmed;
    NEW.confirmed_at := OLD.confirmed_at;
    NEW.attendance_marked_by := auth.uid();
    NEW.attendance_marked_at := NOW();
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.student_id := OLD.student_id;
  NEW.coaster_id := OLD.coaster_id;
  NEW.driver_name := OLD.driver_name;
  NEW.driver_contact := OLD.driver_contact;
  NEW.driver_id := OLD.driver_id;
  NEW.assignment_date := OLD.assignment_date;
  NEW.created_at := OLD.created_at;
  NEW.attendance_status := OLD.attendance_status;
  NEW.attendance_marked_at := OLD.attendance_marked_at;
  NEW.attendance_marked_by := OLD.attendance_marked_by;
  RETURN NEW;
END;
$$;

COMMIT;
