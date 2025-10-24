# Admin Dashboard Setup

This document explains how to set up and use the admin dashboard for TeenOps.

## Features

The admin dashboard includes:
- **User Management**: View all users with filtering and search
- **User Statistics**: Overview of total users, active users, teens, and pending verifications
- **User Actions**: Suspend, activate, or verify users
- **Role-based Access**: Only users with `admin` role can access the dashboard

## Setup Instructions

### 1. Create an Admin User

To create an admin user, you have two options:

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Create a new user or use an existing user
4. Note the user's ID
5. Go to the SQL Editor and run:

```sql
-- Replace 'your-user-id-here' with the actual user ID
UPDATE profiles 
SET role = 'admin', status = 'active'
WHERE id = 'your-user-id-here';
```

#### Option B: Using SQL Migration
1. Run the migration file: `supabase/migrations/20241201_create_admin_user.sql`
2. Follow the instructions in the migration file

### 2. Access the Admin Dashboard

1. Navigate to `/admin` in your application
2. The middleware will automatically check if you're logged in and have admin role
3. If not authenticated, you'll be redirected to login
4. If not an admin, you'll be redirected to the regular dashboard

### 3. Admin Dashboard Features

#### User Management Table
- **Search**: Search users by name or email
- **Filter by Role**: Filter by teen, parent, or admin
- **Filter by Status**: Filter by active, inactive, suspended, or pending verification
- **User Actions**: 
  - Suspend active users
  - Activate suspended users
  - Verify pending users

#### Statistics Dashboard
- Total number of users
- Number of active users
- Number of teen users
- Number of users pending verification

## Security

### Middleware Protection
The admin routes are protected by middleware that:
1. Checks if the user is authenticated
2. Verifies the user has `admin` role
3. Redirects unauthorized users appropriately

### Database Access
Admin functions use the service role key to bypass RLS (Row Level Security) for administrative operations.

## File Structure

```
src/
├── app/admin/
│   └── page.tsx              # Admin dashboard page
├── lib/
│   └── admin.ts              # Admin utility functions
├── middleware.ts             # Route protection middleware
└── components/
    └── ui/                    # UI components used in admin dashboard
```

## API Endpoints

The admin dashboard uses these utility functions:
- `checkAdminAccess()`: Verifies admin permissions
- `getAllUsers()`: Fetches all users
- `updateUserStatus()`: Updates user status
- `getUserStats()`: Gets user statistics

## Footer Integration

The admin login link has been added to the footer of the main page (`src/app/page.tsx`). Users can click "Admin Login" to access the admin dashboard.

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**
   - Ensure the user has `role = 'admin'` in the profiles table
   - Check that the user is properly authenticated

2. **"Profile not found" Error**
   - Ensure the user has a corresponding record in the profiles table
   - Check that the user ID matches between auth.users and profiles

3. **Database Connection Issues**
   - Verify your Supabase environment variables are set correctly
   - Check that the service role key has proper permissions

### Environment Variables Required

Make sure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Customization

You can extend the admin dashboard by:
1. Adding new user management features in `src/app/admin/page.tsx`
2. Creating new admin utility functions in `src/lib/admin.ts`
3. Adding new protected routes in `src/middleware.ts`
4. Customizing the UI components and styling
