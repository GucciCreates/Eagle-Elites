BEGIN;

-- The October 10 schema rebuild recreated departure_groups without restoring
-- its rows. Seed the Islamabad institutions served by the portal's campus
-- routes, then let admins add exact programs from the Groups panel.
INSERT INTO departure_groups (university, department, description, active)
VALUES
  ('Air University', 'Department to be confirmed', 'Please select this option if your program is not listed. The admin team can update your department.', true),
  ('Bahria University', 'Department to be confirmed', 'Please select this option if your program is not listed. The admin team can update your department.', true),
  ('NUST', 'Department to be confirmed', 'Please select this option if your program is not listed. The admin team can update your department.', true),
  ('FAST-NUCES', 'Department to be confirmed', 'Please select this option if your program is not listed. The admin team can update your department.', true),
  ('National Defence University', 'Department to be confirmed', 'Please select this option if your program is not listed. The admin team can update your department.', true)
ON CONFLICT (university, department) DO NOTHING;

COMMIT;
