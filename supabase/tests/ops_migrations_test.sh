#!/usr/bin/env bash
# Usage: a throwaway local Postgres 16 on port 55432 (never a real project).
#   psql -h /tmp -p 55432 -U postgres -f supabase/tests/ops_stub_schema.sql
#   psql ... -d ops -f supabase/migrations/20261127030000_driver_operations.sql
#   psql ... -d ops -f supabase/migrations/20261127040000_admin_operations.sql
#   bash supabase/tests/ops_migrations_test.sh
# Behaviour tests for the ops migrations, run against the local stub database.
P="psql -h /tmp -p 55432 -U postgres -d ops -tA"
pass=0; fail=0
TODAY=$($P -c "select (now() at time zone 'Asia/Karachi')::date")
TOMORROW=$($P -c "select (now() at time zone 'Asia/Karachi')::date + 1")
WEEKSTART=$($P -c "select d - (extract(isodow from d)::int - 1) from (select '$TODAY'::date d) x")
WEEKDAY=$($P -c "select to_char('$TODAY'::date, 'FMDay')")
A1=a0000000-0000-0000-0000-000000000001; A2=a0000000-0000-0000-0000-000000000002; A3=a0000000-0000-0000-0000-000000000003
D1=d0000000-0000-0000-0000-000000000001; D2=d0000000-0000-0000-0000-000000000002; C1=c0000000-0000-0000-0000-000000000001
S1=50000000-0000-0000-0000-000000000001; S2=50000000-0000-0000-0000-000000000002; S3=50000000-0000-0000-0000-000000000003

as() { local uid=$1; shift; $P -c "set role authenticated; set request.jwt.claim.sub = '$uid'; $*" 2>&1; }
check() { # name, expected, actual
  if [[ "$3" == "$2" ]]; then pass=$((pass+1)); echo "PASS  $1"; else fail=$((fail+1)); echo "FAIL  $1: expected [$2] got [$3]"; fi
}
fails() { # name, output: expect an ERROR
  if [[ "$2" == *ERROR* ]]; then pass=$((pass+1)); echo "PASS  $1 (refused)"; else fail=$((fail+1)); echo "FAIL  $1: expected refusal, got [$2]"; fi
}

$P -c "insert into daily_assignments (student_id, assignment_date, driver_id, coaster_id) values
  ('$S1', '$TODAY', '$D1', '$C1'), ('$S2', '$TODAY', '$D1', '$C1'),
  ('$S1', '$TOMORROW', '$D1', '$C1'), ('$S2', '$TOMORROW', '$D1', '$C1'), ('$S3', '$TOMORROW', '$D1', '$C1');
  insert into weekly_schedules values ('$S1', '$WEEKSTART', '$WEEKDAY', '90000000-0000-0000-0000-000000000001', '07:10', '16:30');"

echo "--- Driver roster in pickup order"
check "driver sees own roster, scheduled stop first" "Student One|B-17 MultiGardens|07:10:00
Student Two||" "$(as $D1 "select full_name, coalesce(pickup_point,''), coalesce(morning_time,'') from driver_trip_stops('$TODAY')" | grep -v '^SET')"
check "another driver sees nothing" "0" "$(as $D2 "select count(*) from driver_trip_stops('$TODAY')" | tail -1)"
check "a student can't use the driver roster" "0" "$(as $S1 "select count(*) from driver_trip_stops('$TODAY')" | tail -1)"

echo "--- Vehicle checks"
check "driver records today's check for own vehicle" "INSERT 0 1" "$(as $D1 "insert into vehicle_checks (driver_id, coaster_id, check_date, fuel_ok, tyres_ok, lights_ok, brakes_ok, mirrors_horn_ok) values ('$D1', '$C1', '$TODAY', true, true, true, false, true)" | tail -1)"
fails "driver can't check a vehicle that isn't theirs" "$(as $D2 "insert into vehicle_checks (driver_id, coaster_id, check_date, fuel_ok, tyres_ok, lights_ok, brakes_ok, mirrors_horn_ok) values ('$D2', '$C1', '$TODAY', true, true, true, true, true)")"
fails "driver can't backdate a check" "$(as $D2 "insert into vehicle_checks (driver_id, check_date, fuel_ok, tyres_ok, lights_ok, brakes_ok, mirrors_horn_ok) values ('$D2', '$TODAY'::date - 1, true, true, true, true, true)")"
fails "driver can't file a check for someone else" "$(as $D1 "insert into vehicle_checks (driver_id, check_date, fuel_ok, tyres_ok, lights_ok, brakes_ok, mirrors_horn_ok) values ('$D2', '$TODAY', true, true, true, true, true)")"
check "failed item shows as not all OK, admin can read" "f" "$(as $A1 "select all_ok from vehicle_checks" | tail -1)"
check "students can't read vehicle checks" "0" "$(as $S1 "select count(*) from vehicle_checks" | tail -1)"

echo "--- Trip events"
fails "drivers can't write events directly (server does it)" "$(as $D1 "insert into trip_events (driver_id, trip_date, leg, kind) values ('$D1', '$TODAY', 'morning', 'on_the_way')")"
$P -c "insert into trip_events (driver_id, trip_date, leg, kind) values ('$D1', '$TODAY', 'morning', 'on_the_way')"
fails "a problem needs a type" "$($P -c "insert into trip_events (driver_id, trip_date, leg, kind) values ('$D1', '$TODAY', 'morning', 'problem')" 2>&1)"
check "student on that trip sees the update" "1" "$(as $S1 "select count(*) from trip_events" | tail -1)"
check "student not on that trip doesn't" "0" "$(as $S3 "select count(*) from trip_events where trip_date = '$TODAY'" | tail -1)"
check "driver sees own events" "1" "$(as $D1 "select count(*) from trip_events" | tail -1)"

echo "--- Not riding (ride_skips)"
$P -c "update app_settings set value = value || '{\"skip_cutoff\": \"23:59\"}' where key = 'operations'"
check "student skips tomorrow before the cutoff" "INSERT 0 1" "$(as $S1 "insert into ride_skips (student_id, skip_date) values ('$S1', '$TOMORROW')" | tail -1)"
check "their seat for tomorrow is freed" "0" "$($P -c "select count(*) from daily_assignments where student_id = '$S1' and assignment_date = '$TOMORROW'")"
check "other students keep their seats" "2" "$($P -c "select count(*) from daily_assignments where assignment_date = '$TOMORROW'")"
fails "can't skip today" "$(as $S2 "insert into ride_skips (student_id, skip_date) values ('$S2', '$TODAY')")"
fails "can't skip more than two weeks ahead" "$(as $S2 "insert into ride_skips (student_id, skip_date) values ('$S2', '$TODAY'::date + 20)")"
fails "can't skip for another student" "$(as $S2 "insert into ride_skips (student_id, skip_date) values ('$S3', '$TODAY'::date + 3)")"
$P -c "update app_settings set value = value || '{\"skip_cutoff\": \"00:00\"}' where key = 'operations'"
fails "tomorrow is closed after the cutoff" "$(as $S2 "insert into ride_skips (student_id, skip_date) values ('$S2', '$TOMORROW')")"
fails "and can't be undone after the cutoff" "$(as $S1 "delete from ride_skips where skip_date = '$TOMORROW'" ; as $S1 "select case when count(*) = 1 then 'ERROR still there' else 'removed' end from ride_skips where skip_date = '$TOMORROW'" | tail -1 | sed 's/removed/removed (no error)/')"
check "later days still open after the cutoff" "INSERT 0 1" "$(as $S2 "insert into ride_skips (student_id, skip_date) values ('$S2', '$TODAY'::date + 3)" | tail -1)"
check "students see only their own skips" "1" "$(as $S2 "select count(*) from ride_skips" | tail -1)"
$P -c "update app_settings set value = value || '{\"skip_cutoff\": \"21:00\"}' where key = 'operations'"

echo "--- Holidays cancel trips"
$P -c "update daily_assignments set attendance_status = 'present' where student_id = '$S2' and assignment_date = '$TOMORROW'"
as $A1 "insert into holidays (date, reason) values ('$TOMORROW', 'Test holiday')" >/dev/null
check "unmarked trips on the holiday are removed, marked ones kept" "$S2|present" "$($P -c "select student_id, attendance_status from daily_assignments where assignment_date = '$TOMORROW'")"
check "other days untouched" "2" "$($P -c "select count(*) from daily_assignments where assignment_date = '$TODAY'")"

echo "--- Staff roles"
check "existing admins start as owner" "owner" "$($P -c "select staff_role from admin_users where id = '$A2'")"
check "owner assigns roles" "UPDATE 1" "$(as $A1 "update admin_users set staff_role = 'operations' where id = '$A2'" | tail -1)"
as $A1 "update admin_users set staff_role = 'accounts' where id = '$A3'" >/dev/null
fails "non-owner can't change roles" "$(as $A2 "update admin_users set staff_role = 'owner' where id = '$A2'")"
fails "can't remove the last owner" "$(as $A1 "update admin_users set staff_role = 'operations' where id = '$A1'")"
check "operations staff can't see fee payments" "0" "$(as $A2 "select count(*) from fee_payments" | tail -1)"
check "accounts staff can" "1" "$(as $A3 "select count(*) from fee_payments" | tail -1)"
check "owner can" "1" "$(as $A1 "select count(*) from fee_payments" | tail -1)"
fails "accounts staff can't add holidays" "$(as $A3 "insert into holidays (date, reason) values ('$TODAY'::date + 5, 'x')")"
check "accounts staff can't change trips (no rows changed)" "UPDATE 0" "$(as $A3 "update daily_assignments set attendance_status = 'absent' where assignment_date = '$TODAY'" | tail -1)"
check "accounts staff can still read trips" "2" "$(as $A3 "select count(*) from daily_assignments where assignment_date = '$TODAY'" | tail -1)"
check "operations staff can add holidays" "INSERT 0 1" "$(as $A2 "insert into holidays (date, reason) values ('$TODAY'::date + 6, 'Ops holiday')" | tail -1)"
check "drivers unaffected by staff rules (vehicle check update)" "UPDATE 1" "$(as $D1 "update vehicle_checks set brakes_ok = true where driver_id = '$D1'" | tail -1)"

echo; echo "$pass passed, $fail failed"
