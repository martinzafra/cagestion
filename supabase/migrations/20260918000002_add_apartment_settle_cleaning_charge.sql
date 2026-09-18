-- Most apartments have Casa Amiga absorb the cleaning charge as its own
-- margin (see "CA Other" in Reports) - it never appears on the owner's
-- Booking Settlement. A few apartments settle it transparently instead: the
-- guest's cleaning charge and the real Cleaning/Laundry expense both show up
-- on the statement. This flag opts an apartment into that second model.
ALTER TABLE inventory_apartments ADD COLUMN IF NOT EXISTS settle_cleaning_charge BOOLEAN NOT NULL DEFAULT false;
