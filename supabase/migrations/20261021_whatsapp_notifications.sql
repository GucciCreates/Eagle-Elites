-- WhatsApp notifications: student opt-in + delivery log.
BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles ON DELETE SET NULL,
  phone TEXT,
  event TEXT NOT NULL,          -- approval | fee_due | fee_overdue | holiday | assignment | announcement | test
  template TEXT,
  status TEXT NOT NULL,         -- sent | failed | skipped
  error TEXT,
  provider_message_id TEXT,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_created_idx
  ON whatsapp_messages (created_at DESC);

-- Prevents sending the same reminder twice (e.g. cron retries).
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_dedupe_idx
  ON whatsapp_messages (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status = 'sent';

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can read the log. Writes happen server-side with the
-- service role key, which bypasses RLS.
DROP POLICY IF EXISTS "Admins can read WhatsApp log" ON whatsapp_messages;
CREATE POLICY "Admins can read WhatsApp log"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMIT;
