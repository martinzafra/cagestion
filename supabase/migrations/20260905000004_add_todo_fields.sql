-- Support the new TO DO screen:
-- - todo_status tracks the guest's stay progress (Confirmed/Checked In/
--   Checked Out), independent from the existing booking_status (approval
--   state: Confirmed/Pending Confirmation/Cancelled).
-- - police_registration_date lets Police Registration follow the same
--   status+date pattern as Platform Invoice and Final Liquidation.

CREATE TYPE todo_status_enum AS ENUM ('CONFIRMED', 'CHECKED IN', 'CHECKED OUT');

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS todo_status todo_status_enum DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS police_registration_date DATE;
