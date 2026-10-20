-- Onboarding v2: route + pickup picker, amount due, payment reference,
-- guardian contact, optional student ID card, rejection codes and
-- resubmission, DB-driven pickup zones and per-route seat availability.
--
-- Builds on 20261021000000_security_rls.sql. The existing
-- profiles_guard_update() trigger is left untouched; a second BEFORE trigger
-- (profiles_zz_onboarding_v2, fires after the guard because triggers run in
-- name order) protects and computes the new columns.

-- ---------------------------------------------------------------------------
-- Pickup zones (replaces the hard-coded list in the onboarding form)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pickup_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pickup_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active pickup zones" ON public.pickup_zones;
CREATE POLICY "Anyone can read active pickup zones"
  ON public.pickup_zones FOR SELECT
  USING (active OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage pickup zones" ON public.pickup_zones;
CREATE POLICY "Admins manage pickup zones"
  ON public.pickup_zones FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

INSERT INTO public.pickup_zones (name, sort_order) VALUES
  ('B-17', 10), ('D-17', 20), ('E-11', 30), ('F-10', 40), ('F-11', 50),
  ('G-11', 60), ('G-13', 70), ('I-8', 80), ('I-10', 90),
  ('Bahria Town', 100), ('Rawalpindi Saddar', 110), ('Rawalpindi Cantt', 120)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Routes: optional seat capacity (NULL = unlimited / not tracked)
-- ---------------------------------------------------------------------------
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS seat_capacity INTEGER
  CHECK (seat_capacity IS NULL OR seat_capacity >= 0);

-- ---------------------------------------------------------------------------
-- Profiles: new columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_route_id UUID REFERENCES public.routes ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_point_id UUID REFERENCES public.pickup_points ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wants_ac BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amount_due INTEGER,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
  ADD COLUMN IF NOT EXISTS guardian_relation TEXT,
  ADD COLUMN IF NOT EXISTS student_id_card_path TEXT,
  ADD COLUMN IF NOT EXISTS rejection_code TEXT,
  ADD COLUMN IF NOT EXISTS waitlisted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resubmission_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_payment_reference_key
  ON public.profiles (payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_pending_applied_idx
  ON public.profiles (applied_at) WHERE status = 'pending';

-- Fee constants (mirrored in lib/onboarding/pricing.ts).
CREATE OR REPLACE FUNCTION public.onboarding_amount_due(p_route UUID, p_ac BOOLEAN)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.price + CASE WHEN p_ac THEN 500 ELSE 0 END + 1000
  FROM public.routes r WHERE r.id = p_route;
$$;

CREATE OR REPLACE FUNCTION public.new_payment_reference()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  ref TEXT;
BEGIN
  LOOP
    ref := 'EE-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE payment_reference = ref);
  END LOOP;
  RETURN ref;
END;
$$;

-- Aggregate seat counts only; never exposes who holds a seat.
CREATE OR REPLACE FUNCTION public.route_availability()
RETURNS TABLE (route_id UUID, seat_capacity INTEGER, seats_taken INTEGER, seats_left INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         r.seat_capacity,
         COUNT(p.id)::INTEGER,
         CASE WHEN r.seat_capacity IS NULL THEN NULL
              ELSE GREATEST(r.seat_capacity - COUNT(p.id)::INTEGER, 0) END
  FROM public.routes r
  LEFT JOIN public.profiles p
    ON COALESCE(p.route_id, p.requested_route_id) = r.id
   AND p.status IN ('pending', 'active')
   AND NOT p.waitlisted
  GROUP BY r.id, r.seat_capacity;
$$;

REVOKE ALL ON FUNCTION public.route_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.route_availability() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Guard + compute trigger for the new columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_onboarding_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privileged BOOLEAN := public.is_privileged();
  old_status TEXT;
  in_onboarding BOOLEAN;
  target_route UUID;
  left_seats INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT privileged THEN
      NEW.rejection_code := NULL;
      NEW.waitlisted := FALSE;
      NEW.resubmission_count := 0;
      NEW.payment_reference := NULL;
      NEW.amount_due := NULL;
    END IF;
  ELSE
    old_status := COALESCE(OLD.status, 'incomplete');

    IF NOT privileged THEN
      -- Server-managed columns.
      NEW.rejection_code := OLD.rejection_code;
      NEW.waitlisted := OLD.waitlisted;
      NEW.resubmission_count := OLD.resubmission_count;
      NEW.payment_reference := OLD.payment_reference;
      NEW.amount_due := OLD.amount_due;

      -- Student-editable only while onboarding (same rule as the guard).
      in_onboarding := old_status IN ('incomplete', 'payment_pending', 'rejected')
        OR (old_status = 'pending' AND OLD.applied_at IS NULL);
      IF NOT in_onboarding THEN
        NEW.requested_route_id := OLD.requested_route_id;
        NEW.pickup_point_id := OLD.pickup_point_id;
        NEW.wants_ac := OLD.wants_ac;
        NEW.student_id_card_path := OLD.student_id_card_path;
      END IF;
    END IF;

    -- Fix-and-resubmit: clear the previous rejection.
    IF old_status = 'rejected' AND NEW.status = 'payment_pending' THEN
      NEW.resubmission_count := OLD.resubmission_count + 1;
      NEW.rejected_reason := NULL;
      NEW.rejection_code := NULL;
    END IF;
  END IF;

  -- Pickup point must belong to the chosen route.
  IF NEW.pickup_point_id IS NOT NULL AND NEW.requested_route_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.pickup_points
       WHERE id = NEW.pickup_point_id AND route_id = NEW.requested_route_id
     ) THEN
    RAISE EXCEPTION 'The selected pickup point is not on the selected route.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.payment_reference IS NULL THEN
    NEW.payment_reference := public.new_payment_reference();
  END IF;

  -- Amount due = monthly fee (+ AC) + PKR 1,000 seat reservation.
  target_route := COALESCE(NEW.requested_route_id, NEW.route_id);
  IF NOT privileged OR NEW.amount_due IS NULL
     OR (TG_OP = 'UPDATE' AND (
          NEW.requested_route_id IS DISTINCT FROM OLD.requested_route_id
          OR NEW.wants_ac IS DISTINCT FROM OLD.wants_ac)) THEN
    IF target_route IS NOT NULL THEN
      NEW.amount_due := public.onboarding_amount_due(target_route, NEW.wants_ac);
    ELSIF NOT privileged THEN
      NEW.amount_due := NULL;
    END IF;
  END IF;

  -- On submission, join the waitlist if the route is full.
  IF TG_OP = 'UPDATE' AND NEW.status = 'pending'
     AND COALESCE(OLD.status, '') <> 'pending' AND NEW.requested_route_id IS NOT NULL THEN
    SELECT a.seats_left INTO left_seats
    FROM public.route_availability() a WHERE a.route_id = NEW.requested_route_id;
    NEW.waitlisted := left_seats IS NOT NULL AND left_seats <= 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_zz_onboarding_v2 ON public.profiles;
CREATE TRIGGER profiles_zz_onboarding_v2
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_onboarding_v2();

-- Give every existing profile a reference code (runs as the migration owner,
-- so the guard treats it as privileged).
UPDATE public.profiles SET payment_reference = public.new_payment_reference()
WHERE payment_reference IS NULL;
