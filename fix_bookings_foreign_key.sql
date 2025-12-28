-- Fix missing foreign key constraints to profiles
-- These constraints were dropped when profiles table was recreated with CASCADE

-- Fix bookings foreign key
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Fix services foreign key
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_user_id_fkey;
ALTER TABLE public.services
ADD CONSTRAINT services_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Fix earnings foreign key (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'earnings') THEN
    ALTER TABLE public.earnings DROP CONSTRAINT IF EXISTS earnings_user_id_fkey;
    ALTER TABLE public.earnings
    ADD CONSTRAINT earnings_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix provider_availability foreign key (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_availability') THEN
    ALTER TABLE public.provider_availability DROP CONSTRAINT IF EXISTS provider_availability_user_id_fkey;
    ALTER TABLE public.provider_availability
    ADD CONSTRAINT provider_availability_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix quote_requests foreign key (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_requests') THEN
    ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_customer_id_fkey;
    ALTER TABLE public.quote_requests
    ADD CONSTRAINT quote_requests_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix quotes foreign key (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_provider_id_fkey;
    ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix reviews foreign keys (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fkey;
    ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey
    FOREIGN KEY (reviewee_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
    
    ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
    ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey
    FOREIGN KEY (reviewer_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix user_preferences foreign key (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
    ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
    ALTER TABLE public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix withdrawal_requests foreign keys (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
    ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_user_id_fkey;
    ALTER TABLE public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Fix withdrawals foreign key (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
    ALTER TABLE public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

