-- The app's "Invoice #" grid column is actually revenue_number, an internal
-- auto-increment counter unrelated to the real invoice/receipt numbers the
-- owner assigns on their own paperwork. Add a text field to hold that real
-- reference (e.g. "1".."33", "C1".."C6", or a receipt number like "106"),
-- mirroring the invoice_number field expenses already has.
ALTER TABLE revenue_invoicing ADD COLUMN IF NOT EXISTS invoice_number TEXT;
