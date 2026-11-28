-- Minimal stand-in for the live schema, enough to test the ops migrations.
-- Never run this against a real project: it drops and recreates a database named "ops".
DROP DATABASE IF EXISTS ops;
CREATE DATABASE ops;
\c ops
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, anon, service_role;

CREATE TABLE public.admin_users (id uuid PRIMARY KEY);
CREATE TABLE public.routes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, price int);
CREATE TABLE public.pickup_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, route_id uuid);
CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, institution text, cnic_last4 text, role text DEFAULT 'student', status text DEFAULT 'active', pickup_point_id uuid);
CREATE TABLE public.coasters (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coaster_number text);
CREATE TABLE public.drivers (id uuid PRIMARY KEY, full_name text, active boolean DEFAULT true, usual_vehicle_id uuid);
CREATE TABLE public.daily_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, assignment_date date, driver_id uuid, coaster_id uuid, attendance_status text, UNIQUE (student_id, assignment_date));
CREATE TABLE public.weekly_schedules (student_id uuid, week_start date, day_of_week text, pickup_point_id uuid, morning_departure time, evening_departure time);
CREATE TABLE public.holidays (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), date date, reason text);
CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}');
CREATE TABLE public.fee_payments (student_id uuid, fee_month date, amount int);
CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text);
CREATE TABLE public.departure_slots (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.departure_groups (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.time_options (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

CREATE FUNCTION public.is_privileged() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) OR (auth.uid() IS NULL AND session_user = 'postgres') $$;
CREATE FUNCTION public.is_active_driver(p uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.drivers WHERE id = p AND active) $$;

-- Existing broad policies, roughly as live: admins all, students own rows.
ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY a ON public.daily_assignments FOR ALL TO authenticated USING (public.is_privileged()) WITH CHECK (public.is_privileged());
CREATE POLICY s ON public.daily_assignments FOR SELECT TO authenticated USING (student_id = auth.uid() OR driver_id = auth.uid());
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY a ON public.fee_payments FOR ALL TO authenticated USING (public.is_privileged()) WITH CHECK (public.is_privileged());
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY a ON public.holidays FOR ALL TO authenticated USING (public.is_privileged()) WITH CHECK (public.is_privileged());
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY a ON public.admin_users FOR ALL TO authenticated USING (public.is_privileged()) WITH CHECK (public.is_privileged());
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;

-- Sample people.
INSERT INTO public.admin_users VALUES ('a0000000-0000-0000-0000-000000000001'), ('a0000000-0000-0000-0000-000000000002'), ('a0000000-0000-0000-0000-000000000003');
INSERT INTO public.coasters (id, coaster_number) VALUES ('c0000000-0000-0000-0000-000000000001', 'EE-12');
INSERT INTO public.drivers VALUES ('d0000000-0000-0000-0000-000000000001', 'Driver One', true, 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'Driver Two', true, null);
INSERT INTO public.pickup_points (id, name) VALUES ('90000000-0000-0000-0000-000000000001', 'B-17 MultiGardens'), ('90000000-0000-0000-0000-000000000002', 'Saddar');
INSERT INTO public.profiles (id, full_name, institution, cnic_last4, pickup_point_id) VALUES
  ('50000000-0000-0000-0000-000000000001', 'Student One', 'NUST', '1234', '90000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', 'Student Two', 'FAST', '5678', null),
  ('50000000-0000-0000-0000-000000000003', 'Student Three', 'NDU', '9012', null);
INSERT INTO public.fee_payments VALUES ('50000000-0000-0000-0000-000000000001', '2026-11-01', 9500);
