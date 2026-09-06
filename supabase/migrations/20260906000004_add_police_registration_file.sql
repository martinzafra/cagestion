-- Replace the manually-entered police registration date with a stored
-- photo/screenshot of the actual registration document. The bucket is
-- private (these are personal ID documents) - the app reads files back via
-- a short-lived signed URL rather than a public one.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS police_registration_file TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('police-registrations', 'police-registrations', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Registered users can upload police registration files" ON storage.objects;
CREATE POLICY "Registered users can upload police registration files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'police-registrations' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can view police registration files" ON storage.objects;
CREATE POLICY "Registered users can view police registration files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'police-registrations' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can update police registration files" ON storage.objects;
CREATE POLICY "Registered users can update police registration files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'police-registrations' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can delete police registration files" ON storage.objects;
CREATE POLICY "Registered users can delete police registration files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'police-registrations' AND public.is_registered_user());
