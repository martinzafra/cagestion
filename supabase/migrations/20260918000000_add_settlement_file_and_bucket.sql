-- The owner settlement PDF, generated and archived from the Settlements
-- screen (mirrors police_registration_file: a private bucket, read back via
-- a short-lived signed URL rather than a public one).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_liquidation_file TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('settlement-attachments', 'settlement-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Registered users can upload settlement attachments" ON storage.objects;
CREATE POLICY "Registered users can upload settlement attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'settlement-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can view settlement attachments" ON storage.objects;
CREATE POLICY "Registered users can view settlement attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'settlement-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can update settlement attachments" ON storage.objects;
CREATE POLICY "Registered users can update settlement attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'settlement-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can delete settlement attachments" ON storage.objects;
CREATE POLICY "Registered users can delete settlement attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'settlement-attachments' AND public.is_registered_user());
