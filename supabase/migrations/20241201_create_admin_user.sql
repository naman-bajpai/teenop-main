-- Create admin user migration
-- This script helps you create an admin user in Supabase

-- First, you need to create a user in the auth.users table through Supabase Auth
-- Then run this SQL to update their profile to admin role

-- Example: Update an existing user to admin role
-- Replace 'your-user-id-here' with the actual user ID from auth.users
-- UPDATE profiles 
-- SET role = 'admin', status = 'active'
-- WHERE id = 'your-user-id-here';

-- To find a user ID, you can run:
-- SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Or to create a new admin user profile (after creating auth user):
-- INSERT INTO profiles (
--   id,
--   email,
--   first_name,
--   last_name,
--   role,
--   status,
--   is_verified,
--   created_at,
--   updated_at
-- ) VALUES (
--   'your-user-id-here',
--   'admin@example.com',
--   'Admin',
--   'User',
--   'admin',
--   'active',
--   true,
--   NOW(),
--   NOW()
-- );

-- Grant admin permissions (if you have RLS policies)
-- You may need to adjust these based on your existing RLS policies
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for admin access (adjust as needed)
-- CREATE POLICY "Admins can view all profiles" ON profiles
--   FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- CREATE POLICY "Admins can update all profiles" ON profiles
--   FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
