-- Fix enum mismatch: platform_invoice and final_liquidation use the value
-- 'SENT' in the application (BookingForm.tsx), but they were declared with
-- task_status, which only allows ('TO BE DONE', 'DONE', 'NA'). Every
-- attempt to save a booking with an invoice/liquidation marked as sent
-- failed with "invalid input value for enum task_status: SENT".
-- police_registration correctly uses 'DONE' and keeps task_status.

CREATE TYPE invoice_status AS ENUM ('TO BE DONE', 'SENT', 'NA');

ALTER TABLE bookings
  ALTER COLUMN platform_invoice DROP DEFAULT,
  ALTER COLUMN platform_invoice TYPE invoice_status USING (
    CASE platform_invoice::text
      WHEN 'DONE' THEN 'SENT'
      ELSE platform_invoice::text
    END
  )::invoice_status,
  ALTER COLUMN platform_invoice SET DEFAULT 'TO BE DONE';

ALTER TABLE bookings
  ALTER COLUMN final_liquidation DROP DEFAULT,
  ALTER COLUMN final_liquidation TYPE invoice_status USING (
    CASE final_liquidation::text
      WHEN 'DONE' THEN 'SENT'
      ELSE final_liquidation::text
    END
  )::invoice_status,
  ALTER COLUMN final_liquidation SET DEFAULT 'TO BE DONE';
