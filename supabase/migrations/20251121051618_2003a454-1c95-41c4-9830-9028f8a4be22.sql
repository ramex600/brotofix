-- Create RLS policies for complaint-files bucket to allow chat attachments

-- Allow users to upload files to their chat sessions
CREATE POLICY "Users can upload files in their chat sessions"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.chat_sessions 
    WHERE student_id = auth.uid() OR admin_id = auth.uid()
  )
);

-- Allow users to view files in their chat sessions
CREATE POLICY "Users can view files in their chat sessions"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.chat_sessions 
    WHERE student_id = auth.uid() OR admin_id = auth.uid()
  )
);

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete files in their chat sessions"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.chat_sessions 
    WHERE student_id = auth.uid() OR admin_id = auth.uid()
  )
);