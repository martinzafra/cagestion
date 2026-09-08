-- Adds an End Date to apartments, set when a property is marked inactive
-- (and cleared if it's reactivated), so inventory keeps a record of when
-- each apartment stopped being managed.
ALTER TABLE inventory_apartments
  ADD COLUMN IF NOT EXISTS end_date DATE;
