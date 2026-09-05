-- Add total_rent (daily_price * nights, before cleaning/other charges) as its
-- own stored field, so it can be entered directly in "Total Rent" pricing
-- mode and shown explicitly rather than only ever appearing folded into
-- guest_total_amount.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_rent DECIMAL(10, 2);

-- Backfill existing rows: total_rent = guest_total_amount - cleaning_charge - other_charge,
-- falling back to daily_price * nights when guest_total_amount isn't set.
UPDATE bookings
SET total_rent = COALESCE(
  guest_total_amount - COALESCE(cleaning_charge, 0) - COALESCE(other_charge, 0),
  daily_price * nights
)
WHERE total_rent IS NULL;
