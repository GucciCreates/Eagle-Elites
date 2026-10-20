-- Rollback for 20261021000000_security_rls.sql
-- Restores the previous (insecure) policies and removes the guard triggers.
BEGIN;

DROP TRIGGER IF EXISTS profiles_guard_insert ON public.profiles;
DROP TRIGGER IF EXISTS profiles_guard_update ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS daily_assignments_guard_update ON public.daily_assignments;
DROP TRIGGER IF EXISTS weekly_schedules_guard ON public.weekly_schedules;
DROP TRIGGER IF EXISTS help_messages_guard_insert ON public.help_messages;
DROP TRIGGER IF EXISTS departure_selections_guard ON public.departure_selections;

DROP FUNCTION IF EXISTS public.profiles_guard_insert();
DROP FUNCTION IF EXISTS public.profiles_guard_update();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.daily_assignments_guard_update();
DROP FUNCTION IF EXISTS public.weekly_schedules_guard();
DROP FUNCTION IF EXISTS public.help_messages_guard_insert();
DROP FUNCTION IF EXISTS public.departure_selections_guard();
DROP FUNCTION IF EXISTS public.is_privileged();

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
CREATE POLICY "Anyone can read notifications"
  ON public.notifications FOR SELECT USING (true);

COMMIT;
