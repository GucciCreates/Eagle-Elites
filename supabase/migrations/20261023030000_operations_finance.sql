BEGIN;

ALTER TABLE public.coasters
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'van',
  ADD COLUMN IF NOT EXISTS seat_capacity INTEGER NOT NULL DEFAULT 28,
  ADD COLUMN IF NOT EXISTS maintenance_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS default_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL;

ALTER TABLE public.coasters
  DROP CONSTRAINT IF EXISTS coasters_seat_capacity_check,
  ADD CONSTRAINT coasters_seat_capacity_check CHECK (seat_capacity > 0),
  DROP CONSTRAINT IF EXISTS coasters_maintenance_status_check,
  ADD CONSTRAINT coasters_maintenance_status_check
    CHECK (maintenance_status IN ('active', 'maintenance', 'retired'));

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS cnic TEXT,
  ADD COLUMN IF NOT EXISTS usual_vehicle_id UUID REFERENCES public.coasters(id) ON DELETE SET NULL;

ALTER TABLE public.daily_assignments
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL;
UPDATE public.daily_assignments da
SET route_id = p.route_id
FROM public.profiles p
WHERE da.student_id = p.id AND da.route_id IS NULL;
CREATE INDEX IF NOT EXISTS daily_assignments_route_date_idx
  ON public.daily_assignments(route_id, assignment_date);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fee_due_date DATE;

CREATE OR REPLACE FUNCTION public.profiles_fee_due_date_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.fee_due_date := NULL;
  ELSE
    NEW.fee_due_date := OLD.fee_due_date;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_fee_due_date_guard ON public.profiles;
CREATE TRIGGER profiles_fee_due_date_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_fee_due_date_guard();

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fee_month DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(student_id, fee_month)
);
INSERT INTO public.fee_payments(student_id, fee_month, amount)
SELECT p.id, date_trunc('month', CURRENT_DATE)::date, COALESCE(r.price, 0)
FROM public.profiles p LEFT JOIN public.routes r ON r.id = p.route_id
WHERE p.role = 'student' AND p.status = 'active' AND p.fee_status = 'paid'
ON CONFLICT (student_id, fee_month) DO NOTHING;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read fee payment history" ON public.fee_payments;
CREATE POLICY "Admins read fee payment history"
  ON public.fee_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

CREATE OR REPLACE FUNCTION public.record_profile_fee_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  route_price NUMERIC(12, 2);
BEGIN
  IF NEW.fee_status = 'paid' AND NEW.role = 'student' THEN
    SELECT COALESCE(r.price, 0) INTO route_price
    FROM public.routes r WHERE r.id = NEW.route_id;
    INSERT INTO public.fee_payments(student_id, fee_month, amount, recorded_by)
    VALUES (NEW.id, date_trunc('month', CURRENT_DATE)::date, COALESCE(route_price, 0), auth.uid())
    ON CONFLICT (student_id, fee_month) DO UPDATE
      SET amount = EXCLUDED.amount, recorded_at = NOW(), recorded_by = EXCLUDED.recorded_by;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS record_profile_fee_payment ON public.profiles;
CREATE TRIGGER record_profile_fee_payment
  AFTER UPDATE OF fee_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.record_profile_fee_payment();

CREATE OR REPLACE FUNCTION public.daily_assignments_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged() THEN RETURN NEW; END IF;
  IF public.is_active_driver(auth.uid()) THEN
    IF OLD.driver_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only record attendance for your assigned trips.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.id := OLD.id;
    NEW.student_id := OLD.student_id;
    NEW.coaster_id := OLD.coaster_id;
    NEW.driver_name := OLD.driver_name;
    NEW.driver_contact := OLD.driver_contact;
    NEW.driver_id := OLD.driver_id;
    NEW.route_id := OLD.route_id;
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
  NEW.route_id := OLD.route_id;
  NEW.assignment_date := OLD.assignment_date;
  NEW.created_at := OLD.created_at;
  NEW.attendance_status := OLD.attendance_status;
  NEW.attendance_marked_at := OLD.attendance_marked_at;
  NEW.attendance_marked_by := OLD.attendance_marked_by;
  RETURN NEW;
END;
$$;

COMMIT;
