-- Admin-defined arrival (morning) and departure (evening) time options.
-- group_id NULL = available to everyone; otherwise only to that
-- university/department departure group.
BEGIN;

CREATE TABLE IF NOT EXISTS time_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('arrival', 'departure')),
  time_value TIME NOT NULL,
  label TEXT,
  group_id UUID REFERENCES departure_groups ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS time_options_unique
  ON time_options (kind, time_value, COALESCE(group_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE time_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read time options" ON time_options;
CREATE POLICY "Anyone can read time options"
  ON time_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage time options" ON time_options;
CREATE POLICY "Admins can manage time options"
  ON time_options FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Returns true when `t` is allowed for this kind and departure group.
-- If no active options exist for that scope, any time is allowed
-- (so nothing breaks before admins configure options).
CREATE OR REPLACE FUNCTION is_allowed_time(p_group UUID, p_kind TEXT, t TIME)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM time_options
      WHERE kind = p_kind AND active
        AND (group_id IS NULL OR group_id = p_group)
    )
    OR EXISTS (
      SELECT 1 FROM time_options
      WHERE kind = p_kind AND active AND time_value = t
        AND (group_id IS NULL OR group_id = p_group)
    );
$$;

-- Server-side validation of student-chosen times. Admin writes are exempt.
CREATE OR REPLACE FUNCTION validate_schedule_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT departure_group_id INTO v_group FROM profiles WHERE id = NEW.student_id;

  IF (TG_OP = 'INSERT' OR NEW.morning_departure IS DISTINCT FROM OLD.morning_departure)
     AND NOT is_allowed_time(v_group, 'arrival', NEW.morning_departure) THEN
    RAISE EXCEPTION 'Arrival time % is not an available option.', NEW.morning_departure
      USING ERRCODE = 'check_violation';
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.evening_departure IS DISTINCT FROM OLD.evening_departure)
     AND NOT is_allowed_time(v_group, 'departure', NEW.evening_departure) THEN
    RAISE EXCEPTION 'Departure time % is not an available option.', NEW.evening_departure
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS weekly_schedules_validate_times ON weekly_schedules;
CREATE TRIGGER weekly_schedules_validate_times
  BEFORE INSERT OR UPDATE OF morning_departure, evening_departure
  ON weekly_schedules
  FOR EACH ROW EXECUTE FUNCTION validate_schedule_times();

CREATE OR REPLACE FUNCTION validate_profile_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Only validate values that actually changed.
  IF NEW.preferred_morning IS DISTINCT FROM OLD.preferred_morning
     AND NOT is_allowed_time(NEW.departure_group_id, 'arrival', NEW.preferred_morning) THEN
    RAISE EXCEPTION 'Morning time % is not an available option.', NEW.preferred_morning
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.preferred_evening IS DISTINCT FROM OLD.preferred_evening
     AND NOT is_allowed_time(NEW.departure_group_id, 'departure', NEW.preferred_evening) THEN
    RAISE EXCEPTION 'Evening time % is not an available option.', NEW.preferred_evening
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_times ON profiles;
CREATE TRIGGER profiles_validate_times
  BEFORE UPDATE OF preferred_morning, preferred_evening
  ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_profile_times();

COMMIT;
