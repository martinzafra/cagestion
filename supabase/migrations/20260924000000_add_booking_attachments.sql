-- Free-form documents attached to a booking (contracts, ID copies, guest
-- correspondence...). Stores storage paths in the private booking-attachments
-- bucket, read back via short-lived signed URLs - same pattern as the other
-- attachment buckets.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attachments TEXT[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-attachments', 'booking-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Registered users can upload booking attachments" ON storage.objects;
CREATE POLICY "Registered users can upload booking attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'booking-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can view booking attachments" ON storage.objects;
CREATE POLICY "Registered users can view booking attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can update booking attachments" ON storage.objects;
CREATE POLICY "Registered users can update booking attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'booking-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can delete booking attachments" ON storage.objects;
CREATE POLICY "Registered users can delete booking attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'booking-attachments' AND public.is_registered_user());
