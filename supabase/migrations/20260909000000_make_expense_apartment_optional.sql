-- General expenses (not tied to any specific apartment or booking, e.g.
-- company-wide costs) can now be recorded without an apartment.
ALTER TABLE expenses ALTER COLUMN apartment_id DROP NOT NULL;
