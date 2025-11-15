-- Create storage bucket for complaint files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-files',
  'complaint-files',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
);

-- RLS policies for complaint-files bucket
CREATE POLICY "Students can upload their own complaint files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can view their own complaint files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all complaint files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-files' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Students can update their own complaint files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can delete their own complaint files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);