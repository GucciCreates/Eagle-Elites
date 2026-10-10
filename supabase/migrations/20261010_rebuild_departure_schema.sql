BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP POLICY IF EXISTS "Anyone can read departure groups" ON departure_groups;
DROP POLICY IF EXISTS "Anyone can read departure slots" ON departure_slots;
DROP POLICY IF EXISTS "Students can manage own selections" ON departure_selections;
DROP POLICY IF EXISTS "Admins can manage departure groups" ON departure_groups;
DROP POLICY IF EXISTS "Admins can manage departure slots" ON departure_slots;
DROP POLICY IF EXISTS "Admins can read all selections" ON departure_selections;

ALTER TABLE IF EXISTS departure_slots DROP CONSTRAINT IF EXISTS departure_slots_group_id_fkey;
ALTER TABLE IF EXISTS departure_selections DROP CONSTRAINT IF EXISTS departure_selections_slot_id_fkey;
ALTER TABLE IF EXISTS profiles DROP CONSTRAINT IF EXISTS profiles_departure_group_id_fkey;

DROP TABLE IF EXISTS departure_selections CASCADE;
DROP TABLE IF EXISTS departure_slots CASCADE;
DROP TABLE IF EXISTS departure_groups CASCADE;

CREATE TABLE departure_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  university TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (university, department)
);

CREATE TABLE departure_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES departure_groups ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_number INTEGER NOT NULL,
  pickup_time TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'available',
  created_by UUID REFERENCES admin_users ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (group_id, slot_date, slot_number)
);

CREATE TABLE departure_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles ON DELETE CASCADE,
  slot_id UUID REFERENCES departure_slots ON DELETE CASCADE,
  selection_date DATE NOT NULL,
  selected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (student_id, selection_date)
);

ALTER TABLE profiles
  DROP COLUMN IF EXISTS departure_group_id;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS departure_group_id UUID REFERENCES departure_groups ON DELETE SET NULL;

ALTER TABLE departure_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE departure_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE departure_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read departure groups"
  ON departure_groups FOR SELECT USING (true);

CREATE POLICY "Anyone can read departure slots"
  ON departure_slots FOR SELECT USING (true);

CREATE POLICY "Students can manage own selections"
  ON departure_selections FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage departure groups"
  ON departure_groups FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage departure slots"
  ON departure_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can read all selections"
  ON departure_selections FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

COMMIT;
