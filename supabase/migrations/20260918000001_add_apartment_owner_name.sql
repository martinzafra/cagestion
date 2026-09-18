-- The owner's name, shown on the printed Booking Settlement statement
-- (Settlements screen). Free text like apartment name - joint ownership can
-- go in one field ("Michael & Susan Doyle") rather than modelling separate
-- owner rows.
ALTER TABLE inventory_apartments ADD COLUMN IF NOT EXISTS owner_name TEXT;
