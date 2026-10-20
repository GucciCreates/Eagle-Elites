-- Security hardening: stop students from editing privileged data.
-- Safe to re-run. Does NOT touch any row data.
BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True for admins (admin_users), the service role (server code / cron) and
-- direct SQL sessions (SQL editor, migrations) that have no end-user JWT.
CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    OR COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
    -- session_user (not current_user, which is the definer inside this function)
    OR (auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin'));
$$;

REVOKE ALL ON FUNCTION public.is_privileged() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_privileged() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- New rows created by students always start with safe defaults.
CREATE OR REPLACE FUNCTION public.profiles_guard_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged() THEN
    RETURN NEW;
  END IF;

  NEW.role := 'student';
  NEW.status := 'incomplete';
  NEW.fee_status := 'unpaid';
  NEW.route_id := NULL;
  NEW.coaster_number := NULL;
  NEW.driver_name := NULL;
  NEW.driver_contact := NULL;
  NEW.applied_at := NULL;
  NEW.approved_at := NULL;
  NEW.rejected_reason := NULL;
  NEW.payment_transaction_id := NULL;
  NEW.payment_proof_url := NULL;
  RETURN NEW;
END;
$$;

-- Students may edit their own personal details, but not privileged columns.
-- Privileged columns are silently kept at their old values; status may only
-- move forward through the onboarding steps.
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_status TEXT := COALESCE(OLD.status, 'incomplete');
  new_status TEXT := COALESCE(NEW.status, old_status);
  in_onboarding BOOLEAN;
BEGIN
  IF public.is_privileged() THEN
    RETURN NEW;
  END IF;

  -- Never changeable by students.
  NEW.id := OLD.id;
  NEW.role := OLD.role;
  NEW.fee_status := OLD.fee_status;
  NEW.route_id := OLD.route_id;
  NEW.coaster_number := OLD.coaster_number;
  NEW.driver_name := OLD.driver_name;
  NEW.driver_contact := OLD.driver_contact;
  NEW.approved_at := OLD.approved_at;
  NEW.rejected_reason := OLD.rejected_reason;
  NEW.created_at := OLD.created_at;

  -- Allowed status changes (student side):
  --   incomplete      -> payment_pending   (profile step)
  --   payment_pending -> pending           (payment proof submitted)
  --   rejected        -> payment_pending   (re-apply)
  --   pending (never applied, legacy default) -> payment_pending
  IF new_status IS DISTINCT FROM old_status THEN
    IF NOT (
      (old_status = 'incomplete' AND new_status = 'payment_pending')
      OR (old_status = 'payment_pending' AND new_status = 'pending')
      OR (old_status = 'rejected' AND new_status = 'payment_pending')
      OR (old_status = 'pending' AND OLD.applied_at IS NULL AND new_status = 'payment_pending')
    ) THEN
      RAISE EXCEPTION 'You are not allowed to change your account status.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- applied_at is set by the server when the application is submitted.
  IF new_status = 'pending' AND old_status = 'payment_pending' THEN
    NEW.applied_at := NOW();
  ELSE
    NEW.applied_at := OLD.applied_at;
  END IF;

  -- Onboarding-only fields are frozen once the application is submitted.
  in_onboarding := old_status IN ('incomplete', 'payment_pending', 'rejected')
    OR (old_status = 'pending' AND OLD.applied_at IS NULL);
  IF NOT in_onboarding THEN
    NEW.departure_group_id := OLD.departure_group_id;
    NEW.payment_transaction_id := OLD.payment_transaction_id;
    NEW.payment_proof_url := OLD.payment_proof_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_insert ON public.profiles;
CREATE TRIGGER profiles_guard_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_insert();

DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
CREATE TRIGGER profiles_guard_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Create a profile row for every new auth user (safe defaults), so the
-- onboarding UPDATEs always have a row to update even when signup happens
-- without a session (e.g. email confirmation on).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status, fee_status)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'student', 'incomplete', 'unpaid')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- daily_assignments: students may only confirm their seat.
-- ---------------------------------------------------------------------------
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

  NEW.id := OLD.id;
  NEW.student_id := OLD.student_id;
  NEW.coaster_id := OLD.coaster_id;
  NEW.driver_name := OLD.driver_name;
  NEW.driver_contact := OLD.driver_contact;
  NEW.assignment_date := OLD.assignment_date;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_assignments_guard_update ON public.daily_assignments;
CREATE TRIGGER daily_assignments_guard_update
  BEFORE UPDATE ON public.daily_assignments
  FOR EACH ROW EXECUTE FUNCTION public.daily_assignments_guard_update();

-- ---------------------------------------------------------------------------
-- weekly_schedules: students can't reset their one-change allowance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.weekly_schedules_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.change_count := 0;
    NEW.last_changed_at := NULL;
    RETURN NEW;
  END IF;

  NEW.student_id := OLD.student_id;
  NEW.week_start := OLD.week_start;
  NEW.day_of_week := OLD.day_of_week;

  -- The counter can only go up, by at most one per update.
  NEW.change_count := LEAST(
    GREATEST(COALESCE(NEW.change_count, 0), COALESCE(OLD.change_count, 0)),
    COALESCE(OLD.change_count, 0) + 1
  );

  IF COALESCE(OLD.change_count, 0) >= 1
     AND (NEW.morning_departure IS DISTINCT FROM OLD.morning_departure
          OR NEW.evening_departure IS DISTINCT FROM OLD.evening_departure) THEN
    RAISE EXCEPTION 'You have already used your one allowed change for this day.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS weekly_schedules_guard ON public.weekly_schedules;
CREATE TRIGGER weekly_schedules_guard
  BEFORE INSERT OR UPDATE ON public.weekly_schedules
  FOR EACH ROW EXECUTE FUNCTION public.weekly_schedules_guard();

-- ---------------------------------------------------------------------------
-- help_messages: students can't pre-fill admin replies or status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.help_messages_guard_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged() THEN
    RETURN NEW;
  END IF;
  NEW.status := 'open';
  NEW.reply := NULL;
  NEW.replied_at := NULL;
  NEW.replied_by := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_messages_guard_insert ON public.help_messages;
CREATE TRIGGER help_messages_guard_insert
  BEFORE INSERT ON public.help_messages
  FOR EACH ROW EXECUTE FUNCTION public.help_messages_guard_insert();

-- ---------------------------------------------------------------------------
-- departure_selections: only available slots from the student's own group.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.departure_selections_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_privileged() THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.departure_slots s
    JOIN public.profiles p ON p.id = NEW.student_id
    WHERE s.id = NEW.slot_id
      AND s.group_id = p.departure_group_id
      AND s.status = 'available'
      AND s.slot_date = NEW.selection_date
  ) THEN
    RAISE EXCEPTION 'This departure slot is not available for you.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departure_selections_guard ON public.departure_selections;
CREATE TRIGGER departure_selections_guard
  BEFORE INSERT OR UPDATE ON public.departure_selections
  FOR EACH ROW EXECUTE FUNCTION public.departure_selections_guard();

-- ---------------------------------------------------------------------------
-- notifications: only signed-in users can read announcements.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
CREATE POLICY "Anyone can read notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
