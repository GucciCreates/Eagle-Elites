-- Rollback for 20261127030000_driver_operations.sql.
-- WARNING: dropping the tables deletes the trip status history and vehicle
-- checks recorded since the migration. Export them first if you need them.
BEGIN;

DROP FUNCTION IF EXISTS public.driver_trip_stops(DATE);
DROP TABLE IF EXISTS public.vehicle_checks;
DROP FUNCTION IF EXISTS public.vehicle_check_allowed(UUID, UUID, DATE);
DROP TABLE IF EXISTS public.trip_events;

COMMIT;
