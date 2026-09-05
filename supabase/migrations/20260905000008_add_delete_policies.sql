-- bookings, revenue_invoicing, and expenses had RLS enabled with
-- SELECT/INSERT/UPDATE policies but no DELETE policy at all, so every
-- delete button in the app (Bookings, Revenue, Expenses) silently deletes
-- zero rows for every user, admin included - RLS just filters out all rows
-- rather than raising an error.

CREATE POLICY "Users can delete bookings" ON bookings
  FOR DELETE USING (can_access_apartment(apartment_id));

CREATE POLICY "Users can delete revenue" ON revenue_invoicing
  FOR DELETE USING (can_access_apartment(apartment_id));

CREATE POLICY "Users can delete expenses" ON expenses
  FOR DELETE USING (can_access_apartment(apartment_id));
