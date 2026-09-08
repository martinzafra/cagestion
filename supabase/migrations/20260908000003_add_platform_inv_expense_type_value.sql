-- New Expense Type value for platform-fee expenses (Booking.com/Airbnb
-- invoices), distinct from the existing INVOICE/PAYMENT values.
ALTER TYPE expense_type_enum ADD VALUE IF NOT EXISTS 'PLATFORM INV.';
