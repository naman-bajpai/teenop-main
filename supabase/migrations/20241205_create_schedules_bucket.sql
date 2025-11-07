-- Create the schedules storage bucket
-- Note: Buckets are created in the Supabase dashboard, but we'll prepare the SQL for reference
-- Run this in the Supabase SQL editor if needed, or create via dashboard:
-- Dashboard > Storage > New Bucket > Name: "schedules", Public: true

-- Insert bucket configuration (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'schedules',
  'schedules',
  true, -- Public bucket so URLs can be accessed
  10485760, -- 10MB limit (10 * 1024 * 1024)
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can upload their own schedules" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own schedules" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own schedules" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own schedules" ON storage.objects;
DROP POLICY IF EXISTS "Public can view schedules" ON storage.objects;

-- Create RLS policies for schedules bucket
-- Files are stored as: {user_id}/{filename}
-- Example: "550e8400-e29b-41d4-a716-446655440000/abc123.pdf"

-- Policy: Authenticated users can upload files to their own folder
CREATE POLICY "Users can upload their own schedules"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'schedules' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy: Authenticated users can view files in their own folder
CREATE POLICY "Users can view their own schedules"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'schedules' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy: Authenticated users can update files in their own folder
CREATE POLICY "Users can update their own schedules"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'schedules' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'schedules' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy: Authenticated users can delete files from their own folder
CREATE POLICY "Users can delete their own schedules"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'schedules' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Policy: Public read access (optional - since bucket is public, anyone with URL can view)
-- Remove this policy if you want schedules to be completely private
CREATE POLICY "Public can view schedules"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'schedules');

