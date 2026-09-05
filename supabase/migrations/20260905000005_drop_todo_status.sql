-- todo_status is superseded by a computed value (derived from
-- check_in_date, check_out_date, and the existing booking status),
-- so the manually-set column is no longer needed.

ALTER TABLE bookings DROP COLUMN IF EXISTS todo_status;
DROP TYPE IF EXISTS todo_status_enum;
