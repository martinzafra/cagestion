-- Adds commission %, contract type and contract date to apartments.
CREATE TYPE apartment_contract_type AS ENUM ('None', 'Yearly', 'Unlimited');

ALTER TABLE inventory_apartments
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract apartment_contract_type NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS contract_date DATE;

-- Seed commission % per apartment from historical revenue/invoicing figures.
-- Contract and contract date are intentionally left at their defaults (None / empty).
UPDATE inventory_apartments SET commission_percentage = 22 WHERE name = 'Alexandrite';
UPDATE inventory_apartments SET commission_percentage = 15 WHERE name = 'Barbarita';
UPDATE inventory_apartments SET commission_percentage = 17 WHERE name = 'Casa Artur';
UPDATE inventory_apartments SET commission_percentage = 20 WHERE name = 'Catamaran';
UPDATE inventory_apartments SET commission_percentage = 18 WHERE name = 'TMB';
