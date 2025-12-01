-- Create withdrawal_requests table
-- This table stores withdrawal requests from users that need admin approval

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    platform_fee NUMERIC(10, 2) NOT NULL,
    total_earnings NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected', 'failed')),
    stripe_connect_account_id TEXT,
    stripe_transfer_id TEXT,
    processed_by UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON public.withdrawal_requests(created_at DESC);

-- Add foreign key constraints (only if they don't exist)
DO $$
BEGIN
    -- Add foreign key for user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'withdrawal_requests_user_id_fkey'
    ) THEN
        ALTER TABLE public.withdrawal_requests 
            ADD CONSTRAINT withdrawal_requests_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES public.profiles(id) 
            ON DELETE CASCADE;
    END IF;

    -- Add foreign key for processed_by
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'withdrawal_requests_processed_by_fkey'
    ) THEN
        ALTER TABLE public.withdrawal_requests 
            ADD CONSTRAINT withdrawal_requests_processed_by_fkey 
            FOREIGN KEY (processed_by) 
            REFERENCES public.profiles(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Users can view their own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON public.withdrawal_requests;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests"
    ON public.withdrawal_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
    ON public.withdrawal_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
    ON public.withdrawal_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update withdrawal requests
CREATE POLICY "Admins can update withdrawal requests"
    ON public.withdrawal_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON public.withdrawal_requests;

CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_requests_updated_at();

