-- Storage for revenue/invoicing attachments (the PDF invoice issued for an
-- INVOICE-type revenue entry). Reuses the existing revenue_invoicing.attachment_url
-- column to hold the storage path (private bucket, read back via a short-lived
-- signed URL) - same pattern as expense-attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('revenue-attachments', 'revenue-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Registered users can upload revenue attachments" ON storage.objects;
CREATE POLICY "Registered users can upload revenue attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'revenue-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can view revenue attachments" ON storage.objects;
CREATE POLICY "Registered users can view revenue attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'revenue-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can update revenue attachments" ON storage.objects;
CREATE POLICY "Registered users can update revenue attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'revenue-attachments' AND public.is_registered_user());

DROP POLICY IF EXISTS "Registered users can delete revenue attachments" ON storage.objects;
CREATE POLICY "Registered users can delete revenue attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'revenue-attachments' AND public.is_registered_user());
