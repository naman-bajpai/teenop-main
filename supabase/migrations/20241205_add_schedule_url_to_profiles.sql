-- Add schedule_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS schedule_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_schedule_url ON profiles(schedule_url) WHERE schedule_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN profiles.schedule_url IS 'URL to the uploaded schedule document for teen providers';

