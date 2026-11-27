-- Driver operations: trip status updates, problem reports, daily vehicle
-- checks and a pickup-ordered roster.
--
-- Adds two tables and one read-only function. Does NOT change or delete any
-- existing row, column or policy. Safe to re-run.
-- Rollback: supabase/rollback/20261127030000_driver_operations_rollback.sql
BEGIN;

-- ---------------------------------------------------------------------------
-- trip_events: "on the way", "arriving", "arrived" and problem reports.
-- Written by the server (/api/driver/trip-status) after it verifies the
-- driver; read by the driver, the admins, and the students on that trip.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  trip_date DATE NOT NULL,
  leg TEXT NOT NULL CHECK (leg IN ('morning', 'evening')),
  kind TEXT NOT NULL CHECK (kind IN ('on_the_way', 'arriving', 'arrived', 'problem')),
  problem_type TEXT CHECK (problem_type IS NULL OR problem_type IN ('breakdown', 'traffic', 'accident', 'other')),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  coaster_id UUID REFERENCES public.coasters(id) ON DELETE SET NULL,
  riders_notified INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_events_problem_type_check CHECK ((kind = 'problem') = (problem_type IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS trip_events_date_driver_idx
  ON public.trip_events (trip_date, driver_id, created_at DESC);

ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage trip events" ON public.trip_events;
CREATE POLICY "Admins manage trip events"
  ON public.trip_events FOR ALL TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

DROP POLICY IF EXISTS "Drivers read own trip events" ON public.trip_events;
CREATE POLICY "Drivers read own trip events"
  ON public.trip_events FOR SELECT TO authenticated
  USING (driver_id = auth.uid() AND public.is_active_driver(auth.uid()));

DROP POLICY IF EXISTS "Students read their trip events" ON public.trip_events;
CREATE POLICY "Students read their trip events"
  ON public.trip_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_assignments d
      WHERE d.student_id = auth.uid()
        AND d.driver_id = trip_events.driver_id
        AND d.assignment_date = trip_events.trip_date
    )
  );

-- ---------------------------------------------------------------------------
-- vehicle_checks: one quick pre-trip check per driver per day.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  coaster_id UUID REFERENCES public.coasters(id) ON DELETE SET NULL,
  check_date DATE NOT NULL,
  fuel_ok BOOLEAN NOT NULL,
  tyres_ok BOOLEAN NOT NULL,
  lights_ok BOOLEAN NOT NULL,
  brakes_ok BOOLEAN NOT NULL,
  mirrors_horn_ok BOOLEAN NOT NULL,
  all_ok BOOLEAN GENERATED ALWAYS AS (fuel_ok AND tyres_ok AND lights_ok AND brakes_ok AND mirrors_horn_ok) STORED,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, check_date)
);

CREATE INDEX IF NOT EXISTS vehicle_checks_coaster_date_idx
  ON public.vehicle_checks (coaster_id, check_date DESC);

ALTER TABLE public.vehicle_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read vehicle checks" ON public.vehicle_checks;
CREATE POLICY "Admins read vehicle checks"
  ON public.vehicle_checks FOR SELECT TO authenticated
  USING (public.is_privileged());

DROP POLICY IF EXISTS "Drivers read own vehicle checks" ON public.vehicle_checks;
CREATE POLICY "Drivers read own vehicle checks"
  ON public.vehicle_checks FOR SELECT TO authenticated
  USING (driver_id = auth.uid() AND public.is_active_driver(auth.uid()));

-- A driver records today's check, for their usual vehicle or the one on
-- today's trip, and can correct it the same day.
CREATE OR REPLACE FUNCTION public.vehicle_check_allowed(p_driver UUID, p_coaster UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_driver = auth.uid()
    AND public.is_active_driver(auth.uid())
    AND p_date = (NOW() AT TIME ZONE 'Asia/Karachi')::date
    AND (
      p_coaster IS NULL
      OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = p_driver AND d.usual_vehicle_id = p_coaster)
      OR EXISTS (
        SELECT 1 FROM public.daily_assignments a
        WHERE a.driver_id = p_driver AND a.assignment_date = p_date AND a.coaster_id = p_coaster
      )
    );
$$;

REVOKE ALL ON FUNCTION public.vehicle_check_allowed(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vehicle_check_allowed(UUID, UUID, DATE) TO authenticated;

DROP POLICY IF EXISTS "Drivers record today's vehicle check" ON public.vehicle_checks;
CREATE POLICY "Drivers record today's vehicle check"
  ON public.vehicle_checks FOR INSERT TO authenticated
  WITH CHECK (public.vehicle_check_allowed(driver_id, coaster_id, check_date));

DROP POLICY IF EXISTS "Drivers correct today's vehicle check" ON public.vehicle_checks;
CREATE POLICY "Drivers correct today's vehicle check"
  ON public.vehicle_checks FOR UPDATE TO authenticated
  USING (public.vehicle_check_allowed(driver_id, coaster_id, check_date))
  WITH CHECK (public.vehicle_check_allowed(driver_id, coaster_id, check_date));

-- ---------------------------------------------------------------------------
-- driver_trip_stops(date): the driver's roster in pickup order, with each
-- student's pickup point and times for that day. Same privacy limits as
-- driver_trip_roster: name, institution and last 4 CNIC digits only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.driver_trip_stops(p_date DATE)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  institution TEXT,
  cnic_last4 TEXT,
  pickup_point TEXT,
  morning_time TEXT,
  evening_time TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name::TEXT,
    p.institution::TEXT,
    p.cnic_last4::TEXT,
    COALESCE(sp.name, pp.name)::TEXT,
    ws.morning_departure::TEXT,
    ws.evening_departure::TEXT
  FROM public.daily_assignments d
  JOIN public.profiles p ON p.id = d.student_id
  LEFT JOIN public.weekly_schedules ws
    ON ws.student_id = d.student_id
   AND ws.week_start = p_date - (EXTRACT(ISODOW FROM p_date)::INT - 1)
   AND lower(ws.day_of_week) = lower(to_char(p_date, 'FMDay'))
  LEFT JOIN public.pickup_points sp ON sp.id = ws.pickup_point_id
  LEFT JOIN public.pickup_points pp ON pp.id = p.pickup_point_id
  WHERE d.driver_id = auth.uid()
    AND d.assignment_date = p_date
    AND public.is_active_driver(auth.uid())
  ORDER BY ws.morning_departure NULLS LAST, COALESCE(sp.name, pp.name) NULLS LAST, p.full_name;
$$;

REVOKE ALL ON FUNCTION public.driver_trip_stops(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_trip_stops(DATE) TO authenticated;

COMMIT;
