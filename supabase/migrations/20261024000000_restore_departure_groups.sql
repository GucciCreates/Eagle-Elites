BEGIN;

-- The October 10 schema rebuild recreated departure_groups without restoring
-- its institution/department rows. Recover every known group from existing
-- student profiles so onboarding selectors and departure planning work again.
INSERT INTO departure_groups (university, department, active)
SELECT DISTINCT
  btrim(institution),
  btrim(department),
  true
FROM profiles
WHERE NULLIF(btrim(institution), '') IS NOT NULL
  AND NULLIF(btrim(department), '') IS NOT NULL
ON CONFLICT (university, department) DO NOTHING;

COMMIT;
