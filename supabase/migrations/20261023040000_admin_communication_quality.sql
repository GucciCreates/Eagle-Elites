BEGIN;

ALTER TABLE public.help_messages
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "Admins update help messages" ON public.help_messages;
CREATE POLICY "Admins update help messages"
  ON public.help_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

CREATE OR REPLACE FUNCTION public.help_messages_admin_fields_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_urgent := FALSE;
    NEW.admin_read_at := NULL;
  ELSE
    NEW.is_urgent := OLD.is_urgent;
    NEW.admin_read_at := OLD.admin_read_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_messages_admin_fields_guard ON public.help_messages;
CREATE TRIGGER help_messages_admin_fields_guard
  BEFORE INSERT OR UPDATE ON public.help_messages
  FOR EACH ROW EXECUTE FUNCTION public.help_messages_admin_fields_guard();

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx
  ON public.admin_activity_log(created_at DESC);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read activity log" ON public.admin_activity_log;
CREATE POLICY "Admins read activity log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));
DROP POLICY IF EXISTS "Admins write activity log" ON public.admin_activity_log;
CREATE POLICY "Admins write activity log"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

COMMIT;
