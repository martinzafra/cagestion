-- General business expenses (accountant fees, quarterly taxes, self-employed
-- social security payments, generic supplies) are not tied to any single
-- apartment. Allow apartment_id to be left unset for those, same as
-- booking_id was made optional on revenue_invoicing.
ALTER TABLE expenses ALTER COLUMN apartment_id DROP NOT NULL;
