-- Adds an Active (Yes/No) flag to apartments, defaulting existing and
-- new rows to active so nothing is hidden until someone explicitly
-- marks a property inactive.
ALTER TABLE inventory_apartments
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
