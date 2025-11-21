-- Update complaint-files bucket to support video files and other common file types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Images
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  -- Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  -- Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  -- Text files
  'text/plain',
  'text/csv',
  -- Archives
  'application/zip',
  'application/x-zip-compressed'
],
file_size_limit = 52428800 -- Increase to 50MB for video files
WHERE id = 'complaint-files';