-- New Expense Type for logging what OTA platforms (Airbnb, Booking.com,
-- Idealista, etc.) invoice/charge in fees, so those costs can be tracked
-- toward owner profitability analysis alongside Cleaning/Laundry/Supplies/Tax.
INSERT INTO inventory_expense_types (name) VALUES
  ('Platform Invoice')
ON CONFLICT (name) DO NOTHING;
