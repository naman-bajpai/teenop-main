# Schedule Bucket Setup Guide

This guide explains how to set up the `schedules` storage bucket in Supabase for teen schedule uploads.

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `schedules`
   - **Public bucket**: ✅ Enabled (check this box)
   - **File size limit**: `10485760` (10 MB)
   - **Allowed MIME types**: 
     - `application/pdf`
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
5. Click **Create bucket**

6. After creating the bucket, go to **SQL Editor** and run the RLS policies from the migration file:
   - Copy the policy creation SQL from `supabase/migrations/20241205_create_schedules_bucket.sql`
   - Paste and run in the SQL Editor

## Option 2: Using SQL Migration

Run the migration file directly:

```sql
-- Run the entire file: supabase/migrations/20241205_create_schedules_bucket.sql
```

Or apply via Supabase CLI:
```bash
supabase db push
```

## Bucket Configuration

- **Bucket ID**: `schedules`
- **Public**: `true` (allows direct URL access)
- **Max file size**: 10 MB
- **File structure**: `{user_id}/{random_uuid}.{extension}`
  - Example: `550e8400-e29b-41d4-a716-446655440000/abc123.pdf`

## RLS Policies

The bucket includes the following Row Level Security policies:

1. **Upload Policy**: Users can only upload files to their own folder (`{user_id}/...`)
2. **View Policy**: Users can only view files in their own folder
3. **Update Policy**: Users can only update files in their own folder
4. **Delete Policy**: Users can only delete files from their own folder
5. **Public View Policy**: Public users can view any schedule (since bucket is public)

## Testing

After setup, test by:

1. Sign up as a teen user
2. Navigate to `/onboarding`
3. Upload a schedule file
4. Verify the file appears in the `schedules` bucket under `{user_id}/`

## Troubleshooting

If uploads fail:

1. Check that the bucket exists: `SELECT * FROM storage.buckets WHERE id = 'schedules';`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%schedule%';`
3. Check bucket permissions in the dashboard
4. Ensure the bucket is set to **Public** if you want direct URL access

