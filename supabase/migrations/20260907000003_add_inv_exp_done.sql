-- To Do workflow gets a new closing step: after the existing admin tasks
-- (police registration, platform invoice, final liquidation) are all
-- done/NA, a booking sits in "TO INV/EXP" until its Revenue/Expense entries
-- are reconciled, tracked by this new flag - only then does it become
-- COMPLETED.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS inv_exp_done BOOLEAN NOT NULL DEFAULT FALSE;
