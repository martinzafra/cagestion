-- Revenue invoicing lines (e.g. CA Commission) can now carry VAT, mirroring
-- the amount/vat/total pattern already used on expenses. amount_with_vat is
-- what Reports uses for "CA Commission with VAT" in owner profitability
-- calculations.
ALTER TABLE revenue_invoicing
  ADD COLUMN IF NOT EXISTS vat DECIMAL(10, 2) DEFAULT 0;

-- Postgres won't let a generated column reference another generated column
-- (amount), so this repeats amount's own expression rather than reading it.
ALTER TABLE revenue_invoicing
  ADD COLUMN IF NOT EXISTS amount_with_vat DECIMAL(10, 2) GENERATED ALWAYS AS (
    (total_services * (commission_percentage / 100)) + COALESCE(vat, 0)
  ) STORED;
