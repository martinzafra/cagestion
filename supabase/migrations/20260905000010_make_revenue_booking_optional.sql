-- Not every revenue/collection line is tied to a specific guest stay - e.g.
-- pre-season cleaning/prep costs billed to the owner before the first
-- booking of the year. Allow booking_id to be left unset in that case while
-- still requiring apartment_id.
ALTER TABLE revenue_invoicing ALTER COLUMN booking_id DROP NOT NULL;
