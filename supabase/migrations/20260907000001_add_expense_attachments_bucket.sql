-- Storage for expense invoice/receipt attachments (image, PDF, spreadsheet,
-- etc). Reuses the existing expenses.attachment_url column to hold the
-- storage path (private bucket, read back via a short-lived signed URL) -
-- same pattern as the police-registrations bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Registered users can upload expense attachments" ON storage.objects;
CREATE POLICY "Registered users can upload expense attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expense-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can view expense attachments" ON storage.objects;
CREATE POLICY "Registered users can view expense attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can update expense attachments" ON storage.objects;
CREATE POLICY "Registered users can update expense attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'expense-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can delete expense attachments" ON storage.objects;
CREATE POLICY "Registered users can delete expense attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'expense-attachments' AND public.is_registered_user());
