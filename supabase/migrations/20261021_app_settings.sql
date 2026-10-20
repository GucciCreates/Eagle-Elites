-- Admin-editable app settings (key/value). Starts with bank/payment details
-- used on the onboarding payment page.
BEGIN;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users ON DELETE SET NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can read settings" ON app_settings;
CREATE POLICY "Signed-in users can read settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
CREATE POLICY "Admins can manage settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Seed with the values that were hard-coded in the app.
INSERT INTO app_settings (key, value)
VALUES (
  'payment',
  jsonb_build_object(
    'bank_name', 'Meezan Bank',
    'account_title', 'Eagles Elite Transport Service & Tour Planners',
    'account_number', '98370114507755',
    'iban', 'PK31MEZN0098370114507755',
    'instructions', ''
  )
)
ON CONFLICT (key) DO NOTHING;

COMMIT;
