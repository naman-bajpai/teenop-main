-- Drop existing profiles table and all dependent objects (policies, triggers, indexes, etc.)
DROP TABLE IF EXISTS profiles CASCADE;

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('teen', 'parent', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  zip_code TEXT,
  bio TEXT,
  avatar_url TEXT,
  schedule_url TEXT,
  age INTEGER,
  role user_role NOT NULL DEFAULT 'teen',
  status user_status NOT NULL DEFAULT 'pending_verification',
  interests TEXT[],
  skills TEXT[],
  is_verified BOOLEAN DEFAULT false,
  parent_email TEXT,
  parent_phone TEXT,
  stripe_connect_account_id TEXT,
  verification_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_metadata JSONB;
  first_name_val TEXT;
  last_name_val TEXT;
  age_val INTEGER;
  role_val user_role;
BEGIN
  -- Get user metadata
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract values with defaults
  first_name_val := COALESCE(user_metadata->>'first_name', '');
  last_name_val := COALESCE(user_metadata->>'last_name', '');
  age_val := CASE 
    WHEN user_metadata->>'age' IS NULL OR user_metadata->>'age' = '' THEN NULL
    ELSE (user_metadata->>'age')::INTEGER
  END;
  role_val := COALESCE(
    NULLIF((user_metadata->>'role')::user_role, NULL),
    'teen'::user_role
  );
  
  -- Insert profile (this will bypass RLS because function is SECURITY DEFINER)
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    age,
    role,
    parent_email,
    parent_phone,
    status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    first_name_val,
    last_name_val,
    age_val,
    role_val,
    NULLIF(user_metadata->>'parent_email', ''),
    NULLIF(user_metadata->>'parent_phone', ''),
    'pending_verification'::user_status
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, skip
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error with full details but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: % (SQLSTATE: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create trigger on auth.users to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your security requirements)
-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Public profiles can be viewed by authenticated users (optional - adjust as needed)
CREATE POLICY "Authenticated users can view public profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to insert profiles (for trigger function)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Grant necessary permissions to the function
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;

-- Function to manually create profile for existing users (helper function)
CREATE OR REPLACE FUNCTION public.create_profile_for_user(user_id UUID)
RETURNS void AS $$
DECLARE
  auth_user_record RECORD;
  user_metadata JSONB;
  first_name_val TEXT;
  last_name_val TEXT;
  age_val INTEGER;
  role_val user_role;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RAISE NOTICE 'Profile already exists for user %', user_id;
    RETURN;
  END IF;
  
  -- Get user from auth.users
  SELECT id, email, raw_user_meta_data INTO auth_user_record
  FROM auth.users
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found in auth.users', user_id;
  END IF;
  
  -- Get user metadata
  user_metadata := COALESCE(auth_user_record.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract values with defaults
  first_name_val := COALESCE(user_metadata->>'first_name', '');
  last_name_val := COALESCE(user_metadata->>'last_name', '');
  age_val := CASE 
    WHEN user_metadata->>'age' IS NULL OR user_metadata->>'age' = '' THEN NULL
    ELSE (user_metadata->>'age')::INTEGER
  END;
  role_val := COALESCE(
    NULLIF((user_metadata->>'role')::user_role, NULL),
    'teen'::user_role
  );
  
  -- Insert profile
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    age,
    role,
    parent_email,
    parent_phone,
    status
  )
  VALUES (
    auth_user_record.id,
    COALESCE(auth_user_record.email, ''),
    first_name_val,
    last_name_val,
    age_val,
    role_val,
    NULLIF(user_metadata->>'parent_email', ''),
    NULLIF(user_metadata->>'parent_phone', ''),
    'pending_verification'::user_status
  );
  
  RAISE NOTICE 'Profile created for user %', user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Recreate all foreign key constraints that reference profiles
-- These were dropped when profiles table was dropped with CASCADE
DO $$ 
BEGIN
  -- Recreate bookings foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint bookings_user_id_fkey created';
  END IF;
  
  -- Recreate services foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_user_id_fkey;
    ALTER TABLE public.services ADD CONSTRAINT services_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint services_user_id_fkey created';
  END IF;
  
  -- Recreate earnings foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'earnings') THEN
    ALTER TABLE public.earnings DROP CONSTRAINT IF EXISTS earnings_user_id_fkey;
    ALTER TABLE public.earnings ADD CONSTRAINT earnings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint earnings_user_id_fkey created';
  END IF;
  
  -- Recreate provider_availability foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_availability') THEN
    ALTER TABLE public.provider_availability DROP CONSTRAINT IF EXISTS provider_availability_user_id_fkey;
    ALTER TABLE public.provider_availability ADD CONSTRAINT provider_availability_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint provider_availability_user_id_fkey created';
  END IF;
  
  -- Recreate quote_requests foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_requests') THEN
    ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_customer_id_fkey;
    ALTER TABLE public.quote_requests ADD CONSTRAINT quote_requests_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint quote_requests_customer_id_fkey created';
  END IF;
  
  -- Recreate quotes foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_provider_id_fkey;
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_provider_id_fkey
    FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint quotes_provider_id_fkey created';
  END IF;
  
  -- Recreate reviews foreign keys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fkey;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewee_id_fkey
    FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
    ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey
    FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraints for reviews created';
  END IF;
  
  -- Recreate user_preferences foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
    ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
    ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint user_preferences_user_id_fkey created';
  END IF;
  
  -- Recreate withdrawal_requests foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
    ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_user_id_fkey;
    ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint withdrawal_requests_user_id_fkey created';
  END IF;
  
  -- Recreate withdrawals foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
    ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key constraint withdrawals_user_id_fkey created';
  END IF;
END $$;

